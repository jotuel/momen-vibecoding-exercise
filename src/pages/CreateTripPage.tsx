import React, { useState, useEffect } from 'react';
import { useMutation, useApolloClient, gql } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, DollarSign, Loader2, Sparkles } from 'lucide-react';

// Action Flow ID and Version from schema
const ACTION_FLOW_ID = "13fbf97b-5ee7-440e-93c9-4307baf4ef0b";
const ACTION_FLOW_VERSION = 5;

const CREATE_TRIP_TASK = gql`
  mutation CreateTripTask($args: Json!) {
    fz_create_action_flow_task(
      actionFlowId: "${ACTION_FLOW_ID}",
      versionId: ${ACTION_FLOW_VERSION},
      args: $args
    )
  }
`;

const LISTEN_TASK_RESULT = gql`
  subscription ListenTaskResult($taskId: Long!) {
    fz_listen_action_flow_result(taskId: $taskId) {
      status
      output
    }
  }
`;

const CreateTripPage = () => {
  const navigate = useNavigate();
  const client = useApolloClient();
  const [formData, setFormData] = useState({
    destination: '',
    startDate: '',
    duration: 3,
    budget: 1000
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [createTripTask] = useMutation(CREATE_TRIP_TASK);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoadingStep('Initiating trip planning...');
    setError(null);

    try {
      // 1. Start the action flow
      const { data } = await createTripTask({
        variables: {
          args: {
            destination: formData.destination,
            start_date: formData.startDate,
            duration_days: parseInt(formData.duration.toString()),
            budget: parseInt(formData.budget.toString())
          }
        }
      });

      const taskId = data.fz_create_action_flow_task;
      setLoadingStep('AI is crafting your itinerary...');

      // 2. Subscribe to the result manually
      const observer = client.subscribe({
        query: LISTEN_TASK_RESULT,
        variables: { taskId }
      });

      const subscription = observer.subscribe({
        next: ({ data }) => {
          const result = data?.fz_listen_action_flow_result;

          if (result?.status === 'FAILED') {
             setError('Trip generation failed. Please try again.');
             setIsSubmitting(false);
             subscription.unsubscribe();
          } else if (result?.status === 'COMPLETED') {
            const output = result.output;
            const tripId = output?.trip_id;

            if (tripId) {
              setLoadingStep('Finalizing...');
              subscription.unsubscribe();
              // Add a small delay to ensure data is consistent if needed, then navigate
              setTimeout(() => {
                navigate(`/trips/${tripId}`);
              }, 500);
            } else {
              setError('Trip created but ID missing.');
              setIsSubmitting(false);
              subscription.unsubscribe();
            }
          } else {
            // PROCESSING or CREATED
            setLoadingStep('AI is researching places and activities...');
          }
        },
        error: (err) => {
          console.error('Subscription error:', err);
          setError('Connection lost while waiting for results.');
          setIsSubmitting(false);
        }
      });

    } catch (err: any) {
      console.error('Error creating trip:', err);
      setError(err.message || 'Failed to start trip planning.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Plan Your Next Adventure</h1>
        <p className="text-muted-foreground">
          Let our AI agent generate a personalized itinerary for you.
        </p>
      </div>

      <div className="bg-card border rounded-xl shadow-sm p-6 md:p-8">
        {isSubmitting ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
              <div className="relative bg-primary text-primary-foreground p-4 rounded-full">
                <Sparkles className="h-8 w-8 animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-semibold">Planning your trip to {formData.destination}</h3>
            <p className="text-muted-foreground max-w-xs mx-auto">{loadingStep}</p>
            <div className="w-full max-w-xs bg-secondary h-2 rounded-full overflow-hidden mt-4">
              <div className="h-full bg-primary animate-indeterminate-progress origin-left"></div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">This usually takes about 30-60 seconds.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="destination" className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Destination
              </label>
              <input
                type="text"
                id="destination"
                name="destination"
                required
                placeholder="e.g., Paris, Tokyo, New York"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.destination}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="startDate" className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.startDate}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="duration" className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duration (Days)
                </label>
                <input
                  type="number"
                  id="duration"
                  name="duration"
                  min="1"
                  max="14"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.duration}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="budget" className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Budget (USD)
              </label>
              <input
                type="number"
                id="budget"
                name="budget"
                min="100"
                step="100"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.budget}
                onChange={handleChange}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Trip...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Itinerary
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateTripPage;