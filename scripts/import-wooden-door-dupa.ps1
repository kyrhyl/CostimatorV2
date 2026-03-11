# Import Wooden Panel Door DUPA Template from Screenshot

$dupaTemplate = @{
    payItemNumber = "1010 (2)b"
    payItemDescription = "Doors (Wood Panel)"
    unitOfMeasurement = "Square Meter"
    outputPerHour = 0.36
    
    # Labor (from screenshot)
    laborTemplate = @(
        @{
            designation = "Construction Foreman"
            noOfPersons = 1
            noOfHours = 1.00
        },
        @{
            designation = "Skilled Laborer"
            noOfPersons = 1
            noOfHours = 1.00
        },
        @{
            designation = "Unskilled Laborer"
            noOfPersons = 2
            noOfHours = 1.00
        }
    )
    
    # Equipment (from screenshot - Minor Tools will be added automatically)
    equipmentTemplate = @()
    
    # Materials (from screenshot)
    materialTemplate = @(
        @{
            description = "Wooden Panel Door"
            unit = "m2"
            quantity = 1.00
        }
    )
    
    # Set minor tools configuration
    includeMinorTools = $true
    minorToolsPercentage = 10
    
    # Default percentages (can be modified later in UI)
    ocmPercentage = 15
    cpPercentage = 10
    vatPercentage = 12
    
    isActive = $true
}

# Convert to JSON
$jsonBody = $dupaTemplate | ConvertTo-Json -Depth 10

Write-Host "Creating DUPA Template for: Wooden Panel Door" -ForegroundColor Cyan
Write-Host "Pay Item: 1010 (2)b" -ForegroundColor Yellow
Write-Host ""
Write-Host "JSON Payload:" -ForegroundColor Gray
Write-Host $jsonBody -ForegroundColor DarkGray
Write-Host ""

# POST to API
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/dupa-templates" `
        -Method POST `
        -ContentType "application/json" `
        -Body $jsonBody

    Write-Host "✅ SUCCESS! Template created" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ ERROR!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}
