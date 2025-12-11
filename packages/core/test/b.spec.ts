import {test} from 'vitest'
import {Project} from "../src/index.ts";

// Edit an assertion and save to see HMR in action

test('Squared', () => {
  console.log(Project.of({name:"unit_test"}))
})
