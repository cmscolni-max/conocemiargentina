import { useState } from 'react';

export const useAuthViewModel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptanceDate, setAcceptanceDate] = useState<string | null>(null);

  return {
    isAuthenticated, setIsAuthenticated,
    isRegistering, setIsRegistering,
    showTerms, setShowTerms,
    acceptedTerms, setAcceptedTerms,
    acceptanceDate, setAcceptanceDate
  };
};
