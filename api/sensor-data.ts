import admin from "firebase-admin";

function getDb() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!)
      ),
    });
  }
  return admin.firestore();
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const db = getDb();
    const body = await req.json();

    const { nodeId, temp, humidity, pressure, aqi, battery } = body;

    if (!nodeId) {
      return Response.json({ error: "nodeId is required" }, { status: 400 });
    }

    const readingData = {
      nodeId,
      temp: Number(temp),
      humidity: Number(humidity),
      pressure: Number(pressure),
      aqi: Number(aqi),
      battery: Number(battery || 0),
      timestamp: new Date().toISOString(),
    };

    await db.collection("readings").add(readingData);

    const nodeRef = db.collection("nodes").doc(nodeId);
    const nodeSnap = await nodeRef.get();

    if (nodeSnap.exists) {
      await nodeRef.update({
        status: "online",
        lastUpdate: new Date().toISOString(),
        battery: Number(battery || 0),
      });
    }

    return Response.json({
      success: true,
      message: "Data received and processed",
    });
  } catch (error) {
    return Response.json(
      { error: "Failed to process sensor data" },
      { status: 500 }
    );
  }
}