import { assert, test } from 'vitest'
import {xxx} from "../src/common.ts";
// import {xxx} from "../src/common.js";
// import {_ConfigMode} from "@/index.ts";
// import {xxx} from "@/common.ts";
// import {_ConfigMode} from "../src/index.ts";
// import {xxx} from "../src/common.ts";

test('study undefined', async (t) => {
    // assert.strictEqual(_ConfigMode.Direct, 0);
    assert.strictEqual(xxx, 'xxx');
});