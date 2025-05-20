import { expect, test } from 'vitest'
import {xxx} from "../src/common.ts";
import {Project} from "../src/direct.ts";

// Edit an assertion and save to see HMR in action

test('Squared', () => {
    expect(xxx).toBe("xxx")
    expect(new Project({name:"test"}).name).toBe("test")
})
