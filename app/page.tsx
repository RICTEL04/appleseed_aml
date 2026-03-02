"use client";

import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { organizationRepository, OrganizationRepository } from '@/lib/repositories/organization.repository';

function App() {
  const [router, setRouter] = useState<React.ComponentProps<typeof RouterProvider>['router'] | null>(null);

  useEffect(() => {
    import('./routes').then(({ router }) => {
      setRouter(router);
    });
  }, []);

  if (!router) {
    return null;
  }

  

  return <RouterProvider router={router} />;
}

export default App;
