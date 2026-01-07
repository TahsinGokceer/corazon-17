import { google } from 'googleapis';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Githuba atarken yorum satırına alınabilir. Webgl için kullanıyoruz
// import path from 'path';
// import compression from 'compression';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
// küçük harf kullanalım
const spreadsheetId = process.env.SPREADSHEET_ID || "spreadsheet_id";

// Middleware
app.use(cors({
    origin: 'https://corazon-17.netlify.app',   // Burada webgl'in yayınlandığı linki yazmalıyız.
    methods: ['GET']
}));
app.use(express.json());

// Githuba atarken yorum satırına alınabilir. Webgl için kullanıyoruz
// app.use(compression());

// Statik dosyaları servis et
// app.use(express.static(path.join(__dirname, '../public'), {
//     // index: false, // Bu satır / adresinde index.html açılmasını engeller
//     setHeaders: (res, filePath) => {
//         // .gz uzantılı dosyalar için tarayıcıya "bunu zipten aç" diyoruz
//         if (filePath.endsWith('.gz')) {
//             res.set('Content-Encoding', 'gzip');
//         }

//         // Dosyanın asıl tipini tarayıcıya bildiriyoruz
//         if (filePath.endsWith('.js.gz')) {
//             res.set('Content-Type', 'application/javascript');
//         } else if (filePath.endsWith('.wasm.gz')) {
//             res.set('Content-Type', 'application/wasm');
//         } else if (filePath.endsWith('.data.gz')) {
//             res.set('Content-Type', 'application/octet-stream');
//         }
//     }
// }));

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
    price: string;            // row[2]
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
    layoutType: string;       // row[16]
}

interface BuildingResponse {
    apartments: Apartment[];
    photoGallery: string;
}

app.get('/', (req: Request, res: Response) => {
    return res.json({ hello: "Hello" })
})

app.get('/api/building-data', async (req: Request, res: Response) => {
    try {
        const client = await auth.getClient();
        const googleSheets = google.sheets({ version: 'v4', auth: client as any });

        // Tablodaki A2:Q arasını oku (Başlıkları atlamak için A2'den başlattık)
        const response = await googleSheets.spreadsheets.values.get({
            spreadsheetId,
            range: `'${process.env.PROJECT_NAME}'!A2:Q`,
        });

        const allRows = response.data.values;

        if (!allRows || allRows.length === 0) {
            return res.json({ apartments: [], photoGallery: "" });
        }

        // 1. En son satırı galeriyi temsil etmesi için listeden çıkarıyoruz (pop)
        const lastRow = allRows.pop(); 
        // Galeri linki B sütununda olduğu için lastRow[1]'i alıyoruz
        const photoGallery = lastRow ? lastRow[1] : "";

        const apartmentRows = allRows
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
            floorNumber: Number(row[12].split('.')[0]) || 0,
            block: row[13] || "",
            apartmentNumber: Number(row[14]) || 0,
            grossSquareMeters: Number(row[15]) || 0,
            layoutType: row[16] || ""
        }));

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