import React from 'react';
import AccessControlPage from '../access/AccessControlPage';

/**
 * Backward compatibility wrapper for UsersPage.
 * Renders the new decoupled AccessControlPage view.
 */
export default function UsersPage() {
  return <AccessControlPage />;
}
