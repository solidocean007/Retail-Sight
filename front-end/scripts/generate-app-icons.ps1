param(
    [string]$EdgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
)

$ErrorActionPreference = "Stop"

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontEndRoot = (Resolve-Path (Join-Path $scriptDirectory "..")).Path
$repositoryRoot = (Resolve-Path (Join-Path $frontEndRoot "..")).Path
$temporaryRoot = Join-Path $repositoryRoot ".tmp-app-icon-generation"

if (-not (Test-Path -LiteralPath $EdgePath)) {
    throw "Microsoft Edge was not found at $EdgePath"
}

Add-Type -AssemblyName System.Drawing

function Render-Svg {
    param(
        [Parameter(Mandatory = $true)][string]$SourcePath,
        [Parameter(Mandatory = $true)][string]$DestinationPath,
        [Parameter(Mandatory = $true)][int]$Size,
        [Parameter(Mandatory = $true)][string]$ProfileName
    )

    $profilePath = Join-Path $temporaryRoot $ProfileName
    New-Item -ItemType Directory -Path $profilePath -Force | Out-Null
    if (Test-Path -LiteralPath $DestinationPath) {
        Remove-Item -LiteralPath $DestinationPath -Force
    }

    $sourceUri = [System.Uri]::new((Resolve-Path $SourcePath).Path).AbsoluteUri
    & $EdgePath `
        "--headless" `
        "--disable-gpu" `
        "--hide-scrollbars" `
        "--force-device-scale-factor=1" `
        "--default-background-color=00000000" `
        "--user-data-dir=$profilePath" `
        "--window-size=$Size,$Size" `
        "--screenshot=$DestinationPath" `
        $sourceUri | Out-Null

    $deadline = (Get-Date).AddSeconds(15)
    while (-not (Test-Path -LiteralPath $DestinationPath)) {
        if ((Get-Date) -gt $deadline) {
            throw "Edge did not render $SourcePath"
        }

        Start-Sleep -Milliseconds 200
    }
}

function Resize-Png {
    param(
        [Parameter(Mandatory = $true)][string]$SourcePath,
        [Parameter(Mandatory = $true)][string]$DestinationPath,
        [Parameter(Mandatory = $true)][int]$Size
    )

    $destinationDirectory = Split-Path -Parent $DestinationPath
    New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null

    $sourceImage = [System.Drawing.Image]::FromFile($SourcePath)
    try {
        $destinationImage = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try {
            $destinationImage.SetResolution(96, 96)
            $graphics = [System.Drawing.Graphics]::FromImage($destinationImage)
            try {
                $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
                $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
                $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                $graphics.DrawImage($sourceImage, 0, 0, $Size, $Size)
            }
            finally {
                $graphics.Dispose()
            }

            $destinationImage.Save($DestinationPath, [System.Drawing.Imaging.ImageFormat]::Png)
        }
        finally {
            $destinationImage.Dispose()
        }
    }
    finally {
        $sourceImage.Dispose()
    }
}

function Write-Android-IconSet {
    param(
        [Parameter(Mandatory = $true)][string]$MasterPath,
        [Parameter(Mandatory = $true)][string]$FileName,
        [Parameter(Mandatory = $true)][hashtable]$Sizes
    )

    foreach ($density in $Sizes.Keys) {
        $destination = Join-Path $frontEndRoot "android\app\src\main\res\mipmap-$density\$FileName"
        Resize-Png -SourcePath $MasterPath -DestinationPath $destination -Size $Sizes[$density]
    }
}

try {
    New-Item -ItemType Directory -Path $temporaryRoot -Force | Out-Null

    $publicIcons = Join-Path $frontEndRoot "public\icons"
    $anyMaster = Join-Path $temporaryRoot "app-icon-any-512.png"
    $maskableMaster = Join-Path $temporaryRoot "app-icon-maskable-512.png"
    $foregroundMaster = Join-Path $temporaryRoot "app-icon-foreground-512.png"
    $roundMaster = Join-Path $temporaryRoot "app-icon-round-512.png"

    # These SVG files have a native 512 x 512 canvas. Render at that exact size
    # before producing the platform-specific derivatives below.
    Render-Svg -SourcePath (Join-Path $publicIcons "displaygram-app-icon-v3.svg") -DestinationPath $anyMaster -Size 512 -ProfileName "edge-any"
    Render-Svg -SourcePath (Join-Path $publicIcons "displaygram-app-icon-maskable-v3.svg") -DestinationPath $maskableMaster -Size 512 -ProfileName "edge-maskable"
    Render-Svg -SourcePath (Join-Path $publicIcons "displaygram-app-icon-foreground-v3.svg") -DestinationPath $foregroundMaster -Size 512 -ProfileName "edge-foreground"
    Render-Svg -SourcePath (Join-Path $publicIcons "displaygram-app-icon-round-v3.svg") -DestinationPath $roundMaster -Size 512 -ProfileName "edge-round"

    Resize-Png -SourcePath $anyMaster -DestinationPath (Join-Path $publicIcons "displaygram-app-icon-192-v3.png") -Size 192
    Resize-Png -SourcePath $anyMaster -DestinationPath (Join-Path $publicIcons "displaygram-app-icon-512-v3.png") -Size 512
    Resize-Png -SourcePath $maskableMaster -DestinationPath (Join-Path $publicIcons "displaygram-app-icon-192-maskable-v3.png") -Size 192
    Resize-Png -SourcePath $maskableMaster -DestinationPath (Join-Path $publicIcons "displaygram-app-icon-512-maskable-v3.png") -Size 512
    Resize-Png -SourcePath $maskableMaster -DestinationPath (Join-Path $publicIcons "displaygram-apple-touch-icon-v3.png") -Size 180

    $legacySizes = @{ mdpi = 48; hdpi = 72; xhdpi = 96; xxhdpi = 144; xxxhdpi = 192 }
    $foregroundSizes = @{ mdpi = 108; hdpi = 162; xhdpi = 216; xxhdpi = 324; xxxhdpi = 432 }
    Write-Android-IconSet -MasterPath $anyMaster -FileName "ic_launcher.png" -Sizes $legacySizes
    Write-Android-IconSet -MasterPath $roundMaster -FileName "ic_launcher_round.png" -Sizes $legacySizes
    Write-Android-IconSet -MasterPath $foregroundMaster -FileName "ic_launcher_foreground.png" -Sizes $foregroundSizes

    Resize-Png `
        -SourcePath $maskableMaster `
        -DestinationPath (Join-Path $frontEndRoot "ios\App\App\Assets.xcassets\AppIcon.appiconset\AppIcon-512@2x.png") `
        -Size 1024

    Write-Host "Generated Displaygram web, Android, and iOS app icons."
}
finally {
    $resolvedRepositoryRoot = [System.IO.Path]::GetFullPath($repositoryRoot).TrimEnd('\')
    $resolvedTemporaryRoot = [System.IO.Path]::GetFullPath($temporaryRoot)
    if ($resolvedTemporaryRoot.StartsWith("$resolvedRepositoryRoot\", [System.StringComparison]::OrdinalIgnoreCase) -and
        (Split-Path -Leaf $resolvedTemporaryRoot) -eq ".tmp-app-icon-generation" -and
        (Test-Path -LiteralPath $resolvedTemporaryRoot)) {
        # Edge can briefly leave renderer children alive after the screenshot is
        # written. Stop only children whose command line points at our temp root.
        Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" -ErrorAction SilentlyContinue |
            Where-Object { $_.CommandLine -like "*$resolvedTemporaryRoot*" } |
            ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

        for ($attempt = 0; $attempt -lt 10; $attempt++) {
            try {
                Remove-Item -LiteralPath $resolvedTemporaryRoot -Recurse -Force -ErrorAction Stop
                break
            }
            catch {
                if ($attempt -eq 9) {
                    throw
                }

                Start-Sleep -Milliseconds 300
            }
        }
    }
}
