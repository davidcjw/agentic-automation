import type { Meta, StoryObj } from "@storybook/react";
import { Cell } from "./Cell";

// One story file per component. Each exported story becomes a card in the
// Claude Design pane via /design-sync — give meaningful names and cover the
// real variants (default / interactive / active / muted, sizes…).
const meta: Meta<typeof Cell> = {
  title: "Primitives/Cell",
  component: Cell,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof Cell>;

export const Default: Story = { args: { children: "A" } };

export const Interactive: Story = {
  args: { children: "B", as: "a", href: "#", interactive: true },
};

export const Active: Story = { args: { children: "C", active: true } };

export const Muted: Story = { args: { children: "D", muted: true } };

export const Variants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 0 }}>
      <Cell>一</Cell>
      <Cell interactive as="a" href="#">
        二
      </Cell>
      <Cell active>三</Cell>
      <Cell muted>四</Cell>
    </div>
  ),
};
