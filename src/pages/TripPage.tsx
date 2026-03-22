import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, gql } from "@apollo/client";
import {
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  ArrowLeft,
  Utensils,
  Hotel,
  Camera,
  Navigation,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";

const GET_TRIP_DETAILS = gql`
  query GetTripDetails($id: bigint!) {
    trip_by_pk(id: $id) {
      id
      title
      destination
      start_date
      duration_days
      budget
      summary
      cover_image {
        url
      }
      itinerary_days(order_by: { day_number: asc }) {
        id
        day_number
        date
        theme
        geographic_focus
        image {
          url
        }
        activities(order_by: { start_time: asc }) {
          id
          start_time
          end_time
          description
          activity_type
          location_name
          location_address
          price_level
          duration_minutes
        }
        meals(order_by: { id: asc }) {
          id
          meal_type
          name
          cuisine_type
          location_name
          location_address
          price_level
          reasoning
        }
        accommodation(order_by: { id: asc }) {
          id
          location_name
          location_address
          rating
          price_level
          reasoning
        }
      }
    }
  }
`;

const TripPage = () => {
  const { id } = useParams<{ id: string }>();
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const { loading, error, data } = useQuery(GET_TRIP_DETAILS, {
    variables: { id: id },
    skip: !id,
  });

  const toggleDay = (dayId: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dayId]: !prev[dayId],
    }));
  };

  // Default expand the first day if data is loaded
  React.useEffect(() => {
    if (
      data?.trip_by_pk?.itinerary_days?.length > 0 &&
      Object.keys(expandedDays).length === 0
    ) {
      setExpandedDays({ [data.trip_by_pk.itinerary_days[0].id]: true });
    }
  }, [data]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Trips
        </Link>
        <div
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error.message}</span>
        </div>
      </div>
    );
  }

  const trip = data?.trip_by_pk;

  if (!trip) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Trip not found</h2>
        <Link to="/" className="text-primary hover:underline">
          Return home
        </Link>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Date not specified";
    try {
      return format(new Date(dateString), "EEEE, MMMM d, yyyy");
    } catch (e) {
      return dateString;
    }
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "--:--";
    // Remove seconds and timezone if present for simpler display
    return timeString.substring(0, 5);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="relative h-[300px] md:h-[400px] rounded-xl overflow-hidden">
        {trip.cover_image?.url ? (
          <img
            src={trip.cover_image.url}
            alt={trip.destination}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <MapPin className="h-20 w-20 text-muted-foreground opacity-20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-6 md:p-10 text-white">
          <div className="container mx-auto">
            <Link
              to="/"
              className="inline-flex items-center text-white/80 hover:text-white mb-4 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm transition-colors w-fit"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Trips
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">
              {trip.title || `Trip to ${trip.destination}`}
            </h1>
            <div className="flex flex-wrap gap-4 md:gap-6 text-sm md:text-base text-white/90">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <span>{trip.destination}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>{trip.start_date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span>{trip.duration_days} Days</span>
              </div>
              {trip.budget && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  <span>Budget: ${trip.budget}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      {trip.summary && (
        <section className="max-w-4xl mx-auto bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            Trip Overview
          </h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
            {trip.summary}
          </p>
        </section>
      )}

      {/* Itinerary Section */}
      <section className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold px-1">Itinerary</h2>

        {trip.itinerary_days.map((day: any) => {
          const isExpanded = expandedDays[day.id];

          return (
            <div
              key={day.id}
              className="border rounded-xl bg-card overflow-hidden shadow-sm"
            >
              <button
                onClick={() => toggleDay(day.id)}
                className="w-full flex items-center justify-between p-6 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 text-primary font-bold text-xl h-12 w-12 flex items-center justify-center rounded-lg shrink-0">
                    {day.day_number}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      Day {day.day_number}: {day.theme || "Exploration"}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {formatDate(day.date)}
                      {day.geographic_focus && (
                        <>
                          <span className="mx-1">•</span>
                          <MapPin className="h-3 w-3" />
                          {day.geographic_focus}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              {isExpanded && (
                <div className="px-6 pb-6 border-t bg-muted/5">
                  {/* Day Image if exists */}
                  {day.image?.url && (
                    <div className="mt-4 mb-6 h-48 rounded-lg overflow-hidden relative">
                      <img
                        src={day.image.url}
                        alt={`Day ${day.day_number}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                        <span className="text-white font-medium text-sm">
                          {day.geographic_focus}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-8 mt-6">
                    {/* Accommodations */}
                    {day.accommodation && day.accommodation.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                          <Hotel className="h-4 w-4" /> Accommodation
                        </h4>
                        {day.accommodation.map((acc: any) => (
                          <div
                            key={acc.id}
                            className="bg-background border rounded-lg p-4"
                          >
                            <div className="flex justify-between items-start mb-1">
                              <h5 className="font-bold text-primary">
                                {acc.location_name}
                              </h5>
                              <span className="text-xs font-medium px-2 py-1 bg-secondary rounded text-secondary-foreground">
                                {acc.price_level || "N/A"}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {acc.location_address}
                            </p>
                            {acc.reasoning && (
                              <p className="text-sm border-l-2 border-primary/20 pl-3 italic text-muted-foreground">
                                {acc.reasoning}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Activities Timeline */}
                    {day.activities && day.activities.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                          <Camera className="h-4 w-4" /> Activities
                        </h4>
                        <div className="relative border-l-2 border-muted pl-6 space-y-6 ml-2">
                          {day.activities.map((activity: any) => (
                            <div key={activity.id} className="relative">
                              <div className="absolute -left-[31px] mt-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background"></div>
                              <div className="bg-background border rounded-lg p-4 hover:shadow-sm transition-shadow">
                                <div className="flex flex-wrap justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {formatTime(activity.start_time)} -{" "}
                                      {formatTime(activity.end_time)}
                                    </span>
                                  </div>
                                  {activity.price_level && (
                                    <span className="text-xs text-muted-foreground border px-1.5 py-0.5 rounded">
                                      {activity.price_level}
                                    </span>
                                  )}
                                </div>
                                <h5 className="font-bold text-lg mb-1">
                                  {activity.location_name}
                                </h5>
                                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />{" "}
                                  {activity.location_address}
                                </p>
                                <p className="text-sm">
                                  {activity.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Meals */}
                    {day.meals && day.meals.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                          <Utensils className="h-4 w-4" /> Dining
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {day.meals.map((meal: any) => (
                            <div
                              key={meal.id}
                              className="bg-background border rounded-lg p-4"
                            >
                              <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">
                                    {meal.meal_type}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {meal.cuisine_type}
                                  </span>
                                </div>
                                <span className="text-xs font-medium px-2 py-1 bg-secondary rounded text-secondary-foreground">
                                  {meal.price_level || "$$"}
                                </span>
                              </div>
                              <h5 className="font-bold text-lg mt-2">
                                {meal.location_name || meal.name}
                              </h5>
                              {meal.location_address && (
                                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />{" "}
                                  {meal.location_address}
                                </p>
                              )}
                              {meal.reasoning && (
                                <p className="text-sm text-muted-foreground mt-2 pt-2 border-t border-dashed">
                                  "{meal.reasoning}"
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
};

export default TripPage;
