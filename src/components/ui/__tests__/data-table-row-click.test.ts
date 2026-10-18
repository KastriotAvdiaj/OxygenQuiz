import { describe, expect, it } from "vitest";
import type * as React from "react";

import { isRowClick } from "../data-table-row-click";

/** A table row with an ordinary cell and a ⋯ button, like a quiz row. */
function row() {
  const tr = document.createElement("tr");
  tr.innerHTML = `<td><span class="title">Past Masters</span></td><td><button>⋯</button></td>`;
  document.body.appendChild(tr);
  return tr;
}

const click = (currentTarget: HTMLElement, target: Element) =>
  ({ currentTarget, target }) as unknown as React.MouseEvent<HTMLElement>;

describe("isRowClick", () => {
  it("opens the row from a plain cell", () => {
    const tr = row();
    expect(isRowClick(click(tr, tr.querySelector(".title")!))).toBe(true);
  });

  it("leaves a control in the row to itself", () => {
    const tr = row();
    expect(isRowClick(click(tr, tr.querySelector("button")!))).toBe(false);
  });

  it("ignores a click from a portalled menu or dialog", () => {
    // Radix renders the ⋯ menu and the delete dialog outside the row's DOM, and React bubbles
    // their clicks to the row anyway — so "Delete" must not also open the quiz.
    const tr = row();
    const menuItem = document.createElement("div");
    menuItem.textContent = "Delete";
    document.body.appendChild(menuItem);
    expect(isRowClick(click(tr, menuItem))).toBe(false);
  });
});
