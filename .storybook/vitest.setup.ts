import { beforeAll } from "vitest";
import { setProjectAnnotations } from "@storybook/react";

import * as previewAnnotations from "./preview";

/**
 * Referenced by `vitest.workspace.ts` (the `storybook` project) and required for it to run
 * at all — without this file every story test fails to collect. It applies the same
 * decorators and globals the Storybook UI uses, so a story behaves identically whether you
 * are looking at it or asserting on it.
 *
 * See docs/development/storybook.md and https://storybook.js.org/docs/writing-tests/test-addon.
 *
 * The browser project also needs Playwright's binaries: `npx playwright install`.
 */
const project = setProjectAnnotations([previewAnnotations]);

beforeAll(project.beforeAll);
