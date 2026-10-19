# Opens the migration file and prints Supabase SQL Editor steps.
$root = Split-Path -Parent $PSScriptRoot
$migration = Join-Path $root "supabase\migrations\001_init.sql"

Write-Host ""
Write-Host "RootVillage — Supabase migration" -ForegroundColor Cyan
Write-Host "1) https://supabase.com/dashboard/project/chfyoorjulkwyplyunco/sql/new"
Write-Host "2) Paste contents of:"
Write-Host "   $migration"
Write-Host "3) Run / Execute"
Write-Host "4) Auth → Providers → Google: enable"
Write-Host "5) Add redirect: http://localhost:3000/auth/callback (+ Vercel URL)"
Write-Host ""

if (Test-Path $migration) {
  Invoke-Item $migration
} else {
  Write-Host "Migration file missing." -ForegroundColor Red
}
