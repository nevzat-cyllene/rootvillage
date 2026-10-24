# Prints the Supabase SQL Editor steps and opens the latest migration.
$root = Split-Path -Parent $PSScriptRoot
$migrations = @(
  "001_init.sql",
  "002_clan_atlas.sql",
  "002_profile_name_meta.sql",
  "003_person_avatar.sql",
  "004_heritage_archive.sql",
  "005_relation_integrity.sql",
  "006_heritage_comments.sql"
)

Write-Host ""
Write-Host "Dîwan — Supabase migrations" -ForegroundColor Cyan
Write-Host "1) Open Supabase Dashboard > SQL Editor"
Write-Host "2) Run these files in order:"
foreach ($migration in $migrations) {
  Write-Host "   supabase/migrations/$migration"
}
Write-Host "3) Auth > Providers > Google: enable"
Write-Host "4) Redirect: http://localhost:3000/auth/callback (+ Vercel URL)"
Write-Host ""

$latest = Join-Path $root "supabase\migrations\006_heritage_comments.sql"
if (Test-Path $latest) {
  Invoke-Item $latest
} else {
  Write-Host "Latest migration file missing." -ForegroundColor Red
}
