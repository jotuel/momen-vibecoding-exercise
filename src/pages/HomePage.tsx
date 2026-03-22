import React from "react";
import { useQuery, gql } from "@apollo/client";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Clock, DollarSign } from "lucide-react";

const GET_TRIPS = gql`
  query GetTrips {
    trip(order_by: { created_at: desc }) {
      id
      title
      destination
      start_date
      duration_days
      budget
      cover_image {
        url
      }
    }
  }
`;

const HomePage = () => {
  const { loading, error, data } = useQuery(GET_TRIPS);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4 border border-red-200 rounded-md bg-red-50">
        Error loading trips: {error.message}
      </div>
    );
  }

  const trips = data?.trip || [];

  if (trips.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">
          No trips yet
        </h2>
        <p className="text-gray-500 mb-6">
          Start planning your next adventure!
        </p>
        <Link
          to="/create"
          className="inline-flex items-center px-6 py-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Create Your First Trip
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Trips</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trips.map((trip: any) => (
          <Link
            key={trip.id}
            to={`/trips/${trip.id}`}
            className="group block border rounded-lg overflow-hidden bg-card hover:shadow-lg transition-all duration-200"
          >
            <div className="aspect-video w-full bg-muted relative overflow-hidden">
              {trip.cover_image?.url ? (
                <img
                  src={trip.cover_image.url}
                  alt={trip.title || trip.destination}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-secondary">
                  <MapPin className="h-10 w-10 opacity-20" />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-8">
                <h3 className="text-white font-bold text-xl truncate">
                  {trip.title || `Trip to ${trip.destination}`}
                </h3>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <MapPin className="h-4 w-4" />
                <span>{trip.destination}</span>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{trip.start_date}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{trip.duration_days} days</span>
                </div>
              </div>

              {trip.budget && (
                <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                  <DollarSign className="h-4 w-4" />
                  <span>{trip.budget}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
