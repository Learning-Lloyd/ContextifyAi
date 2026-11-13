<?php

$trustedProxyAddresses = trim((string) env('TRUSTED_PROXIES', ''));

return [
    // Keep local requests on Laravel's default behavior unless deployment config opts in.
    // EthioDeploy documents '*' for its platform proxy; prefer exact IPs/CIDRs if provided.
    'proxies' => $trustedProxyAddresses === ''
        ? null
        : ($trustedProxyAddresses === '*'
            ? '*'
            : array_values(array_filter(array_map('trim', explode(',', $trustedProxyAddresses))))),
];
