import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ApolloProvider } from "@apollo/client";
import { client } from "./lib/apollo";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import CreateTripPage from "./pages/CreateTripPage";
import TripPage from "./pages/TripPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <ApolloProvider client={client}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/create" element={<CreateTripPage />} />
              <Route path="/trips/:id" element={<TripPage />} />
            </Route>
          </Routes>
        </Layout>
      </BrowserRouter>
    </ApolloProvider>
  );
}

export default App;
