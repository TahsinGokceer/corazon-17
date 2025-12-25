import { google } from 'googleapis';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
// küçük harf kullanalım
const spreadsheetId = process.env.SPREADSHEET_ID || "spreadsheet_id";

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET']
}));
app.use(express.json());
app.use(express.static('public'));

const credentials = process.env.GOOGLE_CREDENTIALS 
    ? JSON.parse(process.env.GOOGLE_CREDENTIALS) 
    : require('../gen-lang-client-0773168804-46f43477c131.json'); 

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly',
});

// Veri Modeli (C# tarafındakiyle aynı olacak)
interface Apartment {
    apartmentCode: string;    // row[0]
    squareMeters: number;     // row[1]
    price: string;            // row[2] (Para birimi içerebileceği için string)
    roomCount: string;        // row[3]
    bathroomCount: number;    // row[4]
    facade: string;           // row[5]
    status: string;           // row[6]
    id: string;               // row[7]
    type: string;             // row[8]
    floorPlanUrl: string;     // row[9]
    offerUrl: string;         // row[10]
    infoUrl: string;          // row[11]
    floorNumber: number;      // row[12]
    block: string;            // row[13]
    apartmentNumber: number;  // row[14]
    grossSquareMeters: number;// row[15]
    layoutType: string;       // row[16] (2+1, 3+1 gibi)
}

interface BuildingResponse {
    apartments: Apartment[];
    photoGallery: string;
}

app.get('/', (req: Request, res: Response) => {
    const data = { hello: "Hello" }
    res.json(data)
})

app.get('/api/building-data', async (req: Request, res: Response) => {
    try {
        const client = await auth.getClient();
        const googleSheets = google.sheets({ version: 'v4', auth: client as any });

        // Tablodaki A2:Q arasını oku (Başlıkları atlamak için A2'den başlattık)
        const response = await googleSheets.spreadsheets.values.batchGet({
            spreadsheetId,
            ranges: ["'corazon-17'!A2:Q173", "'corazon-17'!B174:B174"],
        });

        const valueRanges = response.data.valueRanges;

        if (!valueRanges || valueRanges.length < 2) {
            return res.json({ apartments: [], specialInfo: "" });
        }

        // 1. Aralığı (Apartments) işle
        const apartmentRows = valueRanges[0].values || [];
        const apartments: Apartment[] = apartmentRows.map((row) => ({
            apartmentCode: row[0] || "",
            squareMeters: Number(row[1]) || 0,
            price: row[2] || "0",
            roomCount: row[3] || "",
            bathroomCount: Number(row[4]) || 0,
            facade: row[5] || "",
            status: row[6] || "",
            id: row[7] || "",
            type: row[8] || "",
            floorPlanUrl: row[9] || "",
            offerUrl: row[10] || "",
            infoUrl: row[11] || "",
            floorNumber: Number(row[12]) || 0,
            block: row[13] || "",
            apartmentNumber: Number(row[14]) || 0,
            grossSquareMeters: Number(row[15]) || 0,
            layoutType: row[16] || ""
        }));

        // 2. Aralığı (B152 hücresi) işle
        // valueRanges[1].values bir dizi içindeki dizi döner: [[veri]]
        const photoGallery = valueRanges[1].values ? valueRanges[1].values[0][0] : "";

        // Sonucu birleştirip gönder
        const finalResponse: BuildingResponse = {
            apartments: apartments,
            photoGallery: photoGallery
        };

        res.json(finalResponse);
    } catch (error) {
        console.error("Google Sheets Hatası:", error);
        res.status(500).send("Sunucu hatası");
    }
});

app.listen(PORT, () => {
    console.log(`Server http://localhost:${PORT} adresinde çalışıyor`);
});