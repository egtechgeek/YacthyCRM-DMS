<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use RuntimeException;

class QuickBooksCsvParser
{
    /**
     * Iterate over rows in a QuickBooks CSV export and yield associative arrays keyed by normalized headers.
     *
     * @param  \SplFileInfo|string  $file
     * @return \Generator<int, array<string, mixed>>
     */
    public static function iterate($file): \Generator
    {
        $path = $file instanceof UploadedFile ? $file->getRealPath() : (string) $file;

        if (!$path || !is_readable($path)) {
            throw new RuntimeException('Unable to access the QuickBooks CSV file.');
        }

        $handle = fopen($path, 'r');

        if ($handle === false) {
            throw new RuntimeException('Unable to open the QuickBooks CSV file for reading.');
        }

        try {
            $headerRow = fgetcsv($handle);

            if ($headerRow === false) {
                throw new RuntimeException('The QuickBooks CSV file is missing a header row.');
            }

            $header = self::normalizeHeader($headerRow);

            if (empty(array_filter($header, static fn ($value) => $value !== null))) {
                throw new RuntimeException('The QuickBooks CSV header does not contain any usable columns.');
            }

            while (($row = fgetcsv($handle)) !== false) {
                if (self::isEmptyRow($row)) {
                    continue;
                }

                yield self::mapRowToHeader($header, $row);
            }
        } finally {
            fclose($handle);
        }
    }

    /**
     * Normalise the CSV header row and drop blank columns.
     *
     * @param  array<int, string|null>  $headerRow
     * @return array<int, string|null>
     */
    protected static function normalizeHeader(array $headerRow): array
    {
        $normalized = [];
        $occurrences = [];

        foreach ($headerRow as $index => $value) {
            $clean = self::cleanHeaderValue($value);

            if ($clean === '') {
                $normalized[$index] = null;
                continue;
            }

            $key = Str::snake($clean);

            if ($key === '') {
                $normalized[$index] = null;
                continue;
            }

            if (isset($occurrences[$key])) {
                $occurrences[$key]++;
                $key .= '_' . $occurrences[$key];
            } else {
                $occurrences[$key] = 1;
            }

            $normalized[$index] = $key;
        }

        return $normalized;
    }

    /**
     * Map a CSV row to the prepared header keys.
     *
     * @param  array<int, string|null>  $header
     * @param  array<int, string|null>  $row
     * @return array<string, mixed>
     */
    protected static function mapRowToHeader(array $header, array $row): array
    {
        $mapped = [];

        foreach ($row as $index => $value) {
            if (!array_key_exists($index, $header)) {
                continue;
            }

            $key = $header[$index];

            if ($key === null) {
                continue;
            }

            $mapped[$key] = self::sanitizeValue($value);
        }

        return $mapped;
    }

    /**
     * Determine if a CSV row should be treated as empty.
     *
     * @param  array<int, string|null>  $row
     */
    protected static function isEmptyRow(array $row): bool
    {
        foreach ($row as $value) {
            if (self::sanitizeValue($value) !== null) {
                return false;
            }
        }

        return true;
    }

    /**
     * Clean individual header strings.
     */
    protected static function cleanHeaderValue($value): string
    {
        if ($value === null) {
            return '';
        }

        $clean = trim((string) $value);

        // Remove UTF-8 BOM if present.
        $clean = preg_replace('/^\xEF\xBB\xBF/', '', $clean) ?? $clean;

        return $clean;
    }

    /**
     * Normalise value strings.
     */
    protected static function sanitizeValue($value): ?string
    {
        if ($value === null) {
            return null;
        }

        $clean = trim((string) $value);

        $clean = preg_replace('/^\xEF\xBB\xBF/', '', $clean) ?? $clean;

        if ($clean !== '') {
            if (!mb_detect_encoding($clean, 'UTF-8', true)) {
                $clean = mb_convert_encoding($clean, 'UTF-8', 'ISO-8859-1');
            } else {
                $clean = mb_convert_encoding($clean, 'UTF-8', 'UTF-8');
            }
        }

        if ($clean === '') {
            return null;
        }

        return $clean;
    }
}


