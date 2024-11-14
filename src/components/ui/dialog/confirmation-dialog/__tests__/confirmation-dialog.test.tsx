import { Button } from '@/components/ui/button';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmationDialog } from '../confirmation-dialog';
import '@testing-library/jest-dom';


test('should handle confirmation flow', async () => {
  const titleText = 'Are you sure?';
  const bodyText = 'Are you sure you want to delete this item?';
  const confirmationButtonText = 'Confirm';
  const openButtonText = 'Open';

  render(
    <ConfirmationDialog
      icon="danger"
      title={titleText}
      body={bodyText}
      confirmButton={<Button>{confirmationButtonText}</Button>}
      triggerButton={<Button>{openButtonText}</Button>}
    />
  );

  expect(screen.queryByText(titleText)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: openButtonText }));

  await waitFor(() => expect(screen.getByText(titleText)).toBeInTheDocument());
  expect(screen.getByText(bodyText)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  await waitFor(() => expect(screen.queryByText(titleText)).not.toBeInTheDocument());
  expect(screen.queryByText(bodyText)).not.toBeInTheDocument();
});
