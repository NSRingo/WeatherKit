// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
import { Console } from "@nsnanocat/util";
import { Response } from "../process/Response.mjs";

Response($request, $response).then(
    value => $done(value),
    error => {
        Console.error(error);
        $done($response);
    },
);
