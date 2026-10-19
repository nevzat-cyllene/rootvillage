# Opens the migration file and prints Supabase SQL Editor steps.
$root = Split-Path -Parent $PSScriptRoot
$m1 = Join-Path $root "supabase\migrations\001_init.sql"
$m2 = Join-Path $root "supabase\migrations\002_clan_atlas.sql"

Write-Host ""
Write-Host "RootVillage — Supabase migration" -ForegroundColor Cyan
Write-Host "1) https://supabase.com/dashboard/project/chfyoorjulkwyplyunco/sql/new"
Write-Host "2) Run in order:"
Write-Host "   $m1"
Write-Host "   $m2"
Write-Host "3) Auth → Providers → Google: enable"
Write-Host "4) Redirect: http://localhost:3000/auth/callback (+ Vercel URL)"
Write-Host ""

if (Test-Path $m2) { Invoke-Item $m2 }
elseif (Test-Path $m1) { Invoke-Item $m1 }
else { Write-Host "Migration file missing." -ForegroundColor Red }
