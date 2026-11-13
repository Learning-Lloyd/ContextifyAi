<?php

return [
    // Keep public research data rooted in the repository dataset directory by default.
    'root' => env('CONTEXTIFY_DATASETS_PATH') ?: dirname(base_path()).DIRECTORY_SEPARATOR.'datasets',
];
