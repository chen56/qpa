import { expect, test } from 'vitest'
import {xxx} from "src/internal/_common.ts";
import {LazyProject} from "src/lazy.ts";

// Edit an assertion and save to see HMR in action

test('Squared', () => {
    expect(xxx).toBe("xxx")
    expect(new LazyProject()._providers.length).toBe(0)
})
