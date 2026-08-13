param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\public\icons')
)

Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null

function New-LearningIcon {
  param([int]$Size, [string]$Path, [bool]$Maskable = $false)

  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $background = [System.Drawing.Rectangle]::new(0, 0, $Size, $Size)
  $gradient = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $background,
    [System.Drawing.Color]::FromArgb(103, 84, 242),
    [System.Drawing.Color]::FromArgb(67, 52, 190),
    45
  )
  $graphics.FillRectangle($gradient, $background)

  $margin = if ($Maskable) { [int]($Size * 0.18) } else { [int]($Size * 0.11) }
  $tileSize = [int](($Size - ($margin * 2)) * 0.54)
  $offset = [int]($tileSize * 0.54)
  $tiles = @(
    @{ X = $margin; Y = $margin + $offset; Color = [System.Drawing.Color]::FromArgb(255, 138, 97); Text = '+' },
    @{ X = $margin + $offset; Y = $margin; Color = [System.Drawing.Color]::FromArgb(255, 210, 90); Text = '*' },
    @{ X = $margin + ($offset * 2); Y = $margin + $offset; Color = [System.Drawing.Color]::FromArgb(35, 167, 122); Text = 'A' }
  )

  foreach ($tile in $tiles) {
    $rect = [System.Drawing.Rectangle]::new($tile.X, $tile.Y, $tileSize, $tileSize)
    $radius = [int]($tileSize * 0.23)
    $pathShape = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $pathShape.AddArc($rect.X, $rect.Y, $radius, $radius, 180, 90)
    $pathShape.AddArc($rect.Right - $radius, $rect.Y, $radius, $radius, 270, 90)
    $pathShape.AddArc($rect.Right - $radius, $rect.Bottom - $radius, $radius, $radius, 0, 90)
    $pathShape.AddArc($rect.X, $rect.Bottom - $radius, $radius, $radius, 90, 90)
    $pathShape.CloseFigure()
    $brush = [System.Drawing.SolidBrush]::new($tile.Color)
    $graphics.FillPath($brush, $pathShape)

    $fontFamily = 'Segoe UI'
    $font = [System.Drawing.Font]::new($fontFamily, [single]($tileSize * 0.47), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $format = [System.Drawing.StringFormat]::new()
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $textBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
    $graphics.DrawString($tile.Text, $font, $textBrush, [System.Drawing.RectangleF]$rect, $format)
    $textBrush.Dispose(); $format.Dispose(); $font.Dispose(); $brush.Dispose(); $pathShape.Dispose()
  }

  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $gradient.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}

New-LearningIcon -Size 192 -Path (Join-Path $OutputDirectory 'icon-192.png')
New-LearningIcon -Size 512 -Path (Join-Path $OutputDirectory 'icon-512.png')
New-LearningIcon -Size 512 -Path (Join-Path $OutputDirectory 'icon-maskable-512.png') -Maskable $true
New-LearningIcon -Size 180 -Path (Join-Path $OutputDirectory 'apple-touch-icon.png')
