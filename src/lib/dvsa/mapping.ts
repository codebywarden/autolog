export interface DvsaDefect {
  text: string;
  type: "ADVISORY" | "MINOR" | "MAJOR" | "DANGEROUS" | string;
  dangerous: boolean;
}

export interface DvsaMotTest {
  motTestNumber: string;
  completedDate: string;
  expiryDate: string | null;
  odometerValue: string | null;
  odometerUnit: "MI" | "KM" | string | null;
  odometerResultType: string;
  testResult: "PASSED" | "FAILED" | string;
  dataSource: string;
  defects: DvsaDefect[];
}

export interface DvsaVehicleResponse {
  registration: string;
  make: string | null;
  model: string | null;
  firstUsedDate: string | null;
  fuelType: string | null;
  primaryColour: string | null;
  registrationDate: string | null;
  manufactureDate: string | null;
  engineSize: string | null;
  hasOutstandingRecall: string;
  motTests: DvsaMotTest[];
}

export function mapVehicleFields(data: DvsaVehicleResponse) {
  return {
    vrm: data.registration,
    make: data.make,
    model: data.model,
    colour: data.primaryColour,
    fuel_type: data.fuelType,
    engine_size_cc: data.engineSize ? Number(data.engineSize) : null,
    manufacture_date: data.manufactureDate,
    first_used_date: data.firstUsedDate,
  };
}

export function mapMotHistoryRows(vehicleId: string, data: DvsaVehicleResponse) {
  return data.motTests.map((test) => ({
    vehicle_id: vehicleId,
    mot_test_number: test.motTestNumber,
    test_date: test.completedDate.slice(0, 10),
    // Full timestamp, kept alongside test_date so same-day retests
    // (fail in the morning, pass after a repair that afternoon) still
    // order correctly — test_date alone can't distinguish them.
    completed_at: test.completedDate,
    expiry_date: test.expiryDate,
    result: test.testResult === "PASSED" ? "PASS" : "FAIL",
    odometer_value: test.odometerValue ? Number(test.odometerValue) : null,
    odometer_unit: test.odometerUnit ? test.odometerUnit.toLowerCase() : null,
    raw_data: test,
  }));
}
