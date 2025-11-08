<?php

namespace App\Console\Commands;

use App\Models\ChartOfAccount;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\User;
use App\Support\QuickBooksCsvParser;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class ImportQuickBooksGeneralLedger extends Command
{
    protected $signature = 'quickbooks:import-ledger 
        {--ledger= : Path to generalledger.CSV} 
        {--journal= : Path to journal.CSV} 
        {--dry-run : Analyse files without writing to the database}';

    protected $description = 'Import QuickBooks general ledger and journal exports into YachtCRM-DMS journal entries and account balances.';

    protected array $accountCache = [];

    protected array $createdEntries = [];

    protected array $missingAccounts = [];

    protected int $debugMessages = 0;

    protected ?int $systemUserId = null;

    public function handle(): int
    {
        $ledgerPath = $this->option('ledger') ?: base_path('../generalledger.CSV');
        $journalPath = $this->option('journal') ?: base_path('../journal.CSV');
        $dryRun = (bool) $this->option('dry-run');

        $this->info('QuickBooks ledger import starting...');
        $this->loadAccountCache();
        $this->systemUserId = $this->resolveSystemUserId();

        $ledgerStats = $this->processLedgerBalances($ledgerPath, $dryRun);
        $journalStats = $this->processJournalEntries($journalPath, $dryRun);

        if (!empty($this->missingAccounts)) {
            $this->warn('The following accounts from the CSV files were not found in the Chart of Accounts:');
            collect($this->missingAccounts)
                ->sort()
                ->unique()
                ->each(fn ($name) => $this->line(" - {$name}"));
        }

        $this->newLine();
        $this->info('Import summary');
        $this->line('------------------------------------');
        $this->line(sprintf('Ledger balances updated : %d', $ledgerStats['balances']));
        $this->line(sprintf('Ledger totals skipped   : %d', $ledgerStats['skipped']));
        $this->line(sprintf('Journal entries created : %d', $journalStats['created']));
        $this->line(sprintf('Journal entries skipped : %d', $journalStats['skipped']));
        $this->line(sprintf('Journal lines created   : %d', $journalStats['lines']));
        $this->line(sprintf('Dry run                 : %s', $dryRun ? 'YES' : 'NO'));

        return Command::SUCCESS;
    }

    protected function loadAccountCache(): void
    {
        ChartOfAccount::query()
            ->select(['id', 'account_name'])
            ->get()
            ->each(function (ChartOfAccount $account) {
                $this->accountCache[$this->normaliseAccountKey($account->account_name)] = $account->id;
            });
    }

    protected function normaliseAccountKey(?string $name): string
    {
        $clean = trim((string) $name);

        if ($clean === '') {
            return '';
        }

        // Remove trailing parenthetical "(...)" suffixes which QuickBooks includes in ledgers.
        $clean = preg_replace('/\s*\([^)]*\)$/', '', $clean) ?? $clean;

        // Normalise multiple dots and whitespace.
        $clean = preg_replace('/\s+/', ' ', $clean) ?? $clean;

        return Str::lower($clean);
    }

    protected function mapAccountId(?string $rawName): ?int
    {
        if ($rawName === null || trim($rawName) === '') {
            return null;
        }

        $key = $this->normaliseAccountKey($rawName);

        if ($key === '') {
            return null;
        }

        if (array_key_exists($key, $this->accountCache)) {
            return $this->accountCache[$key];
        }

        $this->missingAccounts[] = $rawName;

        return null;
    }

    protected function processLedgerBalances(string $path, bool $dryRun): array
    {
        if (!is_readable($path)) {
            $this->warn("General ledger file not found: {$path}");
            return ['balances' => 0, 'skipped' => 0];
        }

        $balancesUpdated = 0;
        $totalsSkipped = 0;

        if (($handle = fopen($path, 'r')) === false) {
            $this->warn("Unable to read ledger file: {$path}");
            return ['balances' => 0, 'skipped' => 0];
        }

        try {
            $header = fgetcsv($handle); // discard header
            $currentAccount = null;

            while (($row = fgetcsv($handle)) !== false) {
                $nameColumn = $this->sanitizeCsvValue($row[0] ?? null);

                if ($nameColumn !== null) {
                    // Skip high-level grouping headers.
                    if (!Str::startsWith(Str::lower($nameColumn), 'total ')) {
                        // beginning of account section
                        $currentAccount = $nameColumn;
                        continue;
                    }

                    // Totals line for current account.
                    if ($currentAccount === null) {
                        $totalsSkipped++;
                        continue;
                    }

                    $balanceValue = $this->parseAmount($row[9] ?? $row[8] ?? $row[7] ?? null);
                    $accountId = $this->mapAccountId($currentAccount);

                    if ($accountId === null) {
                        $totalsSkipped++;
                        $currentAccount = null;
                        continue;
                    }

                    if (!$dryRun) {
                        ChartOfAccount::whereKey($accountId)->update([
                            'current_balance' => $balanceValue ?? 0,
                        ]);
                    }

                    $balancesUpdated++;
                    $currentAccount = null;
                    continue;
                }

                // Blank header column row; ignore line entries during balance pass.
            }
        } finally {
            fclose($handle);
        }

        return ['balances' => $balancesUpdated, 'skipped' => $totalsSkipped];
    }

    protected function processJournalEntries(string $path, bool $dryRun): array
    {
        if (!is_readable($path)) {
            $this->warn("Journal export file not found: {$path}");
            return ['created' => 0, 'skipped' => 0, 'lines' => 0];
        }

        $iterator = QuickBooksCsvParser::iterate($path);
        $group = null;
        $created = 0;
        $skipped = 0;
        $linesCreated = 0;

        $flushGroup = function () use (&$group, &$created, &$skipped, &$linesCreated, $dryRun) {
            if (!$group) {
                return;
            }

            $entryNumber = $group['reference'];

            if ($this->journalEntryExists($entryNumber)) {
                $skipped++;
                $group = null;
                return;
            }

            $lines = collect($group['lines'])
                ->filter(function ($line) {
                    return ($line['debit'] ?? 0) > 0 || ($line['credit'] ?? 0) > 0;
                })
                ->groupBy('account_id')
                ->map(function ($items) {
                    $debit = $items->sum('debit');
                    $credit = $items->sum('credit');

                    return [
                        'account_id' => $items->first()['account_id'],
                        'debit' => round($debit, 2),
                        'credit' => round($credit, 2),
                    ];
                })
                ->values()
                ->toArray();

            if (empty($lines)) {
                $this->debug('Skipping entry with no valid lines', $group);
                $skipped++;
                $group = null;
                return;
            }

            $totalDebits = round(array_sum(array_column($lines, 'debit')), 2);
            $totalCredits = round(array_sum(array_column($lines, 'credit')), 2);

            if (abs($totalDebits - $totalCredits) > 0.01) {
                $this->debug(sprintf('Unbalanced journal entry skipped (ref: %s, debits: %.2f, credits: %.2f)', $entryNumber, $totalDebits, $totalCredits));
                $skipped++;
                $group = null;
                return;
            }

            if (!$dryRun) {
                $entry = JournalEntry::create([
                    'entry_number' => $entryNumber,
                    'entry_date' => $group['date'],
                    'description' => $group['description'] ?: 'QuickBooks Import',
                    'status' => 'posted',
                    'memo' => $group['memo'],
                    'created_by' => $this->systemUserId,
                ]);

                foreach ($lines as $line) {
                    $entry->lines()->create([
                        'account_id' => $line['account_id'],
                        'debit' => $line['debit'],
                        'credit' => $line['credit'],
                    ]);
                    $linesCreated++;
                }

                $this->createdEntries[] = $entry->entry_number;
            } else {
                $linesCreated += count($lines);
            }

            $created++;
            $group = null;
        };

        foreach ($iterator as $row) {
            $transNumber = $row['trans#'] ?? null;
            $type = $row['type'] ?? null;
            $date = $row['date'] ?? null;
            $accountName = $row['account'] ?? null;
            $memo = $row['memo'] ?? null;
            $name = $row['name'] ?? null;

            $debit = $this->parseAmount($row['debit'] ?? null);
            $credit = $this->parseAmount($row['credit'] ?? null);

            $isGroupDelimiter = empty(array_filter([$accountName, $debit, $credit], fn ($value) => $value !== null && $value !== 0.0));

            if ($transNumber !== null) {
                $flushGroup();

                $reference = $this->buildEntryReference($transNumber, $type, $row['num'] ?? null, $date);

                $this->debug('Processing transaction ' . $reference);

                $group = [
                    'reference' => $reference,
                    'date' => $this->parseDate($date) ?? now(),
                    'description' => trim(($type ? "{$type} " : '') . ($row['num'] ?? '')),
                    'memo' => trim(($name ? "{$name} " : '') . ($memo ?? '')),
                    'lines' => [],
                ];
            }

            if ($isGroupDelimiter) {
                continue;
            }

            if (!$group) {
                // Skip orphaned rows before the first transaction header.
                continue;
            }

            $accountId = $this->mapAccountId($accountName);

            if (!$accountId) {
                continue;
            }

            $group['lines'][] = [
                'account_id' => $accountId,
                'debit' => $debit ?? 0,
                'credit' => $credit ?? 0,
            ];
        }

        $flushGroup();

        return [
            'created' => $created,
            'skipped' => $skipped,
            'lines' => $linesCreated,
        ];
    }

    protected function parseAmount($value): ?float
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $clean = str_replace([',', '$'], '', trim($value));

        if ($clean === '') {
            return null;
        }

        if (Str::startsWith($clean, '(') && Str::endsWith($clean, ')')) {
            $clean = '-' . trim($clean, '()');
        }

        return (float) $clean;
    }

    protected function parseDate(?string $value): ?Carbon
    {
        if (!$value) {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable $e) {
            return null;
        }
    }

    protected function sanitizeCsvValue($value): ?string
    {
        if ($value === null) {
            return null;
        }

        $clean = trim((string) $value);
        $clean = preg_replace('/^\xEF\xBB\xBF/', '', $clean) ?? $clean;

        return $clean === '' ? null : $clean;
    }

    protected function buildEntryReference(?string $transNumber, ?string $type, ?string $num, ?string $date): string
    {
        if ($transNumber) {
            return 'QB-' . Str::slug($transNumber);
        }

        $parts = array_filter([
            $type ? Str::slug($type) : null,
            $num ? Str::slug($num) : null,
            $date ? Str::slug($date) : null,
        ]);

        if (!empty($parts)) {
            return 'QB-' . implode('-', $parts);
        }

        return 'QB-' . Str::uuid();
    }

    protected function journalEntryExists(string $reference): bool
    {
        return JournalEntry::where('entry_number', $reference)->exists();
    }

    protected function debug(string $message, ?array $group = null): void
    {
        if ($this->debugMessages >= 5) {
            return;
        }

        $this->debugMessages++;
        $this->warn($message . ($group ? ' [' . ($group['reference'] ?? 'unknown') . ']' : ''));
    }

    protected function resolveSystemUserId(): ?int
    {
        $user = User::query()
            ->whereIn('role', ['admin', 'office_staff'])
            ->orderBy('id')
            ->first();

        if (!$user) {
            $user = User::query()->orderBy('id')->first();
        }

        return $user?->id;
    }
}

