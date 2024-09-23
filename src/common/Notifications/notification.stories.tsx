import { Meta, StoryObj } from '@storybook/react';

import { Notification } from './Notification';

const meta: Meta<typeof Notification> = {
  title: 'Components/Notifications',
  component: Notification,
  parameters: {
    controls: { expanded: true },
  },
};

export default meta;

type Story = StoryObj<typeof Notification>;

export const Info: Story = {
  args: {
    notification: {
      id: '1',
      type: 'info',
      title: 'Hello Info',
      message: 'This is info notification',
    },
    onDismiss: (id :string) => alert(`Dismissing Notification with id: ${id}`),
  },
};

export const Success: Story = {
  args: {
    notification: {
      id: '1',
      type: 'success',
      title: 'Hello Success',
      message: 'This is success notification',
    },
    onDismiss: (id :string) => alert(`Dismissing Notification with id: ${id}`),
  },
};

export const Warning: Story = {
  args: {
    notification: {
      id: '1',
      type: 'warning',
      title: 'Hello Warning',
      message: 'This is warning notification',
    },
    onDismiss: (id :string) => alert(`Dismissing Notification with id: ${id}`),
  },
};

export const Error: Story = {
  args: {
    notification: {
      id: '1',
      type: 'error',
      title: 'Hello Error',
      message: 'This is error notification',
    },
    onDismiss: (id :string) => alert(`Dismissing Notification with id: ${id}`),
  },
};
