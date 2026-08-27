import fs from "node:fs";
import path from "node:path";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { TimelineItem } from "@/lib/timeline";
import type { FactsheetSummary } from "@/lib/factsheet-summary";

// Cached across invocations within the same server process — the logo
// file never changes at runtime, so there's no reason to re-read and
// re-encode it on every export request.
let cachedLogoDataUri: string | null = null;

function getLogoDataUri(): string {
  if (!cachedLogoDataUri) {
    const filePath = path.join(
      process.cwd(),
      "src/assets/motor360-logo-compact.png",
    );
    const base64 = fs.readFileSync(filePath).toString("base64");
    cachedLogoDataUri = `data:image/png;base64,${base64}`;
  }
  return cachedLogoDataUri;
}

interface VehicleInfo {
  vrm: string;
  make: string | null;
  model: string | null;
  colour: string | null;
  fuel_type: string | null;
  engine_size_cc: number | null;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  logo: { width: 110, height: 26.1, marginBottom: 16 },
  eyebrow: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#1E4FD8",
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: { fontSize: 18, marginBottom: 4 },
  subtitle: { fontSize: 11, color: "#555555", marginBottom: 16 },
  summaryBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
    marginBottom: 20,
  },
  summaryItem: { width: "50%", marginBottom: 8 },
  summaryLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#999999",
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  summaryValue: { fontSize: 10.5, color: "#111111" },
  advisoryHeading: {
    width: "100%",
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#999999",
    letterSpacing: 0.5,
    marginTop: 2,
    marginBottom: 3,
  },
  advisoryItem: { width: "100%", fontSize: 9.5, color: "#b91c1c", marginBottom: 2 },
  row: {
    flexDirection: "row",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 8,
  },
  date: { width: 70, color: "#555555" },
  // flexBasis: 0 alongside flexGrow is the part that actually matters
  // here — without it, Yoga sizes this column to its content instead
  // of the space the row has for it, so long unbroken text (a note, a
  // defect description) overflows past the page's right padding
  // instead of wrapping.
  rowBody: { flexDirection: "column", flexGrow: 1, flexBasis: 0 },
  label: { fontFamily: "Helvetica-Bold" },
  meta: { color: "#555555", marginTop: 2 },
  pass: { color: "#15803d" },
  fail: { color: "#b91c1c" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    fontSize: 8,
    color: "#999999",
    textAlign: "center",
  },
});

export function VehicleHistoryDocument({
  vehicle,
  timeline,
  summary,
  showCost,
}: {
  vehicle: VehicleInfo;
  timeline: TimelineItem[];
  summary: FactsheetSummary;
  showCost: boolean;
}) {
  const generatedAt = new Date().toISOString().slice(0, 10);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Image src={getLogoDataUri()} style={styles.logo} />
        <Text style={styles.eyebrow}>
          {showCost ? "FULL SERVICE RECORD" : "VEHICLE FACTSHEET"}
        </Text>
        <Text style={styles.title}>{vehicle.vrm}</Text>
        <Text style={styles.subtitle}>
          {[
            vehicle.make,
            vehicle.model,
            vehicle.colour,
            vehicle.fuel_type,
            vehicle.engine_size_cc && `${vehicle.engine_size_cc}cc`,
          ]
            .filter(Boolean)
            .join(" · ") || "Motor360 vehicle history"}
        </Text>

        <View style={styles.summaryBox}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>CURRENT MILEAGE</Text>
            <Text style={styles.summaryValue}>
              {summary.currentMileage != null
                ? `${summary.currentMileage.toLocaleString()} mi`
                : "Not recorded"}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>AVERAGE ANNUAL MILEAGE</Text>
            <Text style={styles.summaryValue}>
              {summary.avgMileagePerYear != null
                ? `~${summary.avgMileagePerYear.toLocaleString()} mi/year`
                : "Not enough history yet"}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>MOT STATUS</Text>
            <Text style={styles.summaryValue}>{summary.motStatusMessage}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>OWNED SINCE</Text>
            <Text style={styles.summaryValue}>
              {summary.ownedSinceYears != null
                ? summary.ownedSinceYears < 1
                  ? `${Math.max(1, Math.round(summary.ownedSinceYears * 12))} months`
                  : `${summary.ownedSinceYears.toFixed(1)} years`
                : "Unknown"}
            </Text>
          </View>
          {summary.outstandingAdvisories.length > 0 && (
            <>
              <Text style={styles.advisoryHeading}>
                OUTSTANDING MOT ADVISORIES ({summary.outstandingAdvisories.length})
              </Text>
              {summary.outstandingAdvisories.map((text, index) => (
                <Text key={index} style={styles.advisoryItem}>
                  • {text}
                </Text>
              ))}
            </>
          )}
        </View>

        {timeline.length === 0 ? (
          <Text>No history recorded yet.</Text>
        ) : (
          timeline.map((item) =>
            item.kind === "mot" ? (
              <View key={`mot-${item.entry.id}`} style={styles.row}>
                <Text style={styles.date}>{item.entry.test_date}</Text>
                <View style={styles.rowBody}>
                  <Text style={styles.label}>
                    MOT test —{" "}
                    <Text
                      style={
                        item.entry.result === "PASS" ? styles.pass : styles.fail
                      }
                    >
                      {item.entry.result === "PASS" ? "Pass" : "Fail"}
                    </Text>
                  </Text>
                  {item.entry.odometer_value != null && (
                    <Text style={styles.meta}>
                      {item.entry.odometer_value.toLocaleString()}{" "}
                      {item.entry.odometer_unit}
                    </Text>
                  )}
                  {showCost && item.entry.cost != null && (
                    <Text style={styles.meta}>
                      £{item.entry.cost.toFixed(2)}
                    </Text>
                  )}
                  {(item.entry.raw_data?.defects ?? []).map((defect, index) => (
                    <Text key={index} style={styles.meta}>
                      • [{defect.type}] {defect.text}
                    </Text>
                  ))}
                </View>
              </View>
            ) : (
              <View key={`service-${item.entry.id}`} style={styles.row}>
                <Text style={styles.date}>{item.entry.entry_date}</Text>
                <View style={styles.rowBody}>
                  <Text style={styles.label}>
                    {item.entry.service_type[0].toUpperCase() +
                      item.entry.service_type.slice(1)}
                    {item.entry.verified ? "  (Verified)" : ""}
                  </Text>
                  {item.entry.mileage != null && (
                    <Text style={styles.meta}>
                      {item.entry.mileage.toLocaleString()} mi
                    </Text>
                  )}
                  {showCost && item.entry.cost != null && (
                    <Text style={styles.meta}>
                      £{item.entry.cost.toFixed(2)}
                    </Text>
                  )}
                  {item.entry.garage_name && (
                    <Text style={styles.meta}>{item.entry.garage_name}</Text>
                  )}
                  {item.entry.notes && (
                    <Text style={styles.meta}>{item.entry.notes}</Text>
                  )}
                </View>
              </View>
            ),
          )
        )}

        <Text style={styles.footer} fixed>
          Generated by Motor360 on {generatedAt}. Reflects the Motor360 record
          at time of export; attached invoice files are not included.
        </Text>
      </Page>
    </Document>
  );
}
