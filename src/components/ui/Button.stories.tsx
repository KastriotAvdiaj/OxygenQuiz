import { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";

// Meta defines the component and parameters for Storybook
const meta: Meta<typeof Button> = {
  title: "Components/Button", // Name in Storybook UI
  component: Button, // The actual Button component
  args: {
    children: "Button", // Default label
  },
  argTypes: {
    variant: { control: "select" }, // Allows selecting different variants
    size: { control: "select" }, // Allows selecting different sizes
    isPending: { control: "boolean" }, // Toggle loading spinner
  },
};

export default meta;


type Story = StoryObj<typeof Button>;


export const Default: Story = {};


export const AddSaveButton: Story = {
  args: {
    variant: "addSave", 
    size: "default", 
  },
};

export const OutlineButton: Story = {
  args: {
    variant: "outline",
    size: "sm",
  },
};

export const PendingButton: Story = {
  args: {
    isPending: true, 
  },
};

export const DashboardButton: Story = {
  args: {
    variant: "dashboard",
    size: "dashboard",
  },
};
