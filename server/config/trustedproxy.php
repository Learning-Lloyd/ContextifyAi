<?php

$trustedProxyAddresses = trim((string) env('TRUSTED_PROXIES', ''));

return [
    // Set to the trusted reverse-proxy IPs/CIDRs in production; do not use * on a public server.
    'proxies' => $trustedProxyAddresses === ''
        ? null
        : array_values(array_filter(array_map('trim', explode(',', $trustedProxyAddresses)))),
];
