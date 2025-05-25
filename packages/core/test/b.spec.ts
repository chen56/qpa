import { expect, test } from 'vitest'
import {xxx} from "../src/common.ts";
import {PlannedProject} from "src/lazy.ts";

// Edit an assertion and save to see HMR in action

test('Squared', () => {
    expect(xxx).toBe("xxx")
    expect(new PlannedProject({name:"test"}).name).toBe("test")
})
