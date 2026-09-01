import { Meta, StoryObj } from '@storybook/react';

import { Button } from '@/components/ui/button';

import { ConfirmationDialog } from './confirmation-dialog';

const meta: Meta<typeof ConfirmationDialog> = {
  component: ConfirmationDialog,
};

export default meta;

type Story = StoryObj<typeof ConfirmationDialog>;

export const Danger: Story = {
  args: {
    icon: 'danger',
    title: 'Confirmation',
    body: 'Hello World',
    confirmButton: <Button className="bg-red-500">Confirm</Button>,
    triggerButton: <Button>Open</Button>,
  },
};

export const Info: Story = {
  args: {
    icon: 'info',
    title: 'Confirmation',
    body: 'Hello World',
    confirmButton: <Button>Confirm</Button>,
    triggerButton: <Button>Open</Button>,
  },
};

/**
 * No `icon` — the default. Omitting it used to fall back to the red `danger` glyph, which put a
 * warning on dialogs asking something entirely routine. An alert that appears everywhere stops
 * reading as an alert, so the icon is now opt-in.
 */
export const NoIcon: Story = {
  args: {
    title: 'Leave this quiz?',
    body: 'Your progress is saved. You can pick up where you left off.',
    cancelButtonText: 'Keep playing',
    confirmButton: <Button variant="destructive">Leave quiz</Button>,
    triggerButton: <Button>Open</Button>,
  },
};
