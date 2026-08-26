import fs from "node:fs";
import path from "node:path";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { TimelineItem } from "@/lib/timeline";

// Read once per warm serverless instance rather than per request — the
// file never changes at runtime. react-pdf needs real bytes (a data
// URI works), not the URL a Next.js static import would give a React
// component in the browser.
let cachedLogoDataUri: string | null = null;

function getLogoDataUri(): string {
  if (!cachedLogoDataUri) {
    const filePath = path.join(process.cwd(), "src", "assets", "logo.png");
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
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  logo: { width: 150, height: 150, marginBottom: -20, marginLeft: -12 },
  title: { fontSize: 18, marginBottom: 4 },
  subtitle: { fontSize: 11, color: "#555555", marginBottom: 20 },
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
}: {
  vehicle: VehicleInfo;
  timeline: TimelineItem[];
}) {
  const generatedAt = new Date().toISOString().slice(0, 10);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Image src={getLogoDataUri()} style={styles.logo} />
        <Text style={styles.title}>{vehicle.vrm}</Text>
        <Text style={styles.subtitle}>
          {[vehicle.make, vehicle.model, vehicle.colour, vehicle.fuel_type]
            .filter(Boolean)
            .join(" · ") || "AutoLog vehicle history"}
        </Text>

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
          Generated by AutoLog on {generatedAt}. Reflects the AutoLog record
          at time of export; attached invoice files are not included.
        </Text>
      </Page>
    </Document>
  );
}
