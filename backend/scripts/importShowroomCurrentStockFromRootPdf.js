const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const stockData = [
  {
    sr: 1,
    vehicle: "Jac T9 Hunter",
    model: "T9 Hunter",
    year: "2025",
    color: "Black",
    mileage: 27000,
    askingPrice: "9600000",
    careOf: "AL Asr",
    regNumber: "UNREGISTERED",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 2,
    vehicle: "Kia Sportage",
    model: "Sportage",
    year: "2020",
    color: "White",
    mileage: 90000,
    askingPrice: "6000000",
    careOf: "AL Asr",
    regNumber: "ARG-153",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 3,
    vehicle: "Kia Sportage Hev",
    model: "Sportage Hev",
    year: "2026",
    color: "Black",
    mileage: 27000,
    askingPrice: "11500000",
    careOf: "AL Asr",
    regNumber: "BJW-273",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 4,
    vehicle: "Honda N One",
    model: "N One",
    year: "2021/2025",
    color: "Cream",
    mileage: 0,
    askingPrice: "3900000",
    careOf: "AL Asr",
    regNumber: "UNREGISTERED",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 5,
    vehicle: "Daihatsu Mira",
    model: "Mira",
    year: "2022/2024",
    color: "Sky Blue",
    mileage: 48000,
    askingPrice: "4000000",
    careOf: "AL Asr",
    regNumber: "UNREGISTERED",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 6,
    vehicle: "Suzuki Jimny",
    model: "Jimny",
    year: "2020/2026",
    color: "White",
    mileage: 0,
    askingPrice: "6200000",
    careOf: "AL Asr",
    regNumber: "UNREGISTERED",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 7,
    vehicle: "Kia Sorento V6",
    model: "Sorento V6",
    year: "2021",
    color: "Silver",
    mileage: 46000,
    askingPrice: "8500000",
    careOf: "AL Asr",
    regNumber: "BJ-2776",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 8,
    vehicle: "Honda Civic",
    model: "Civic",
    year: "2021",
    color: "Black",
    mileage: 188000,
    askingPrice: "5800000",
    careOf: "AL Asr",
    regNumber: "UNREGISTERED",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 9,
    vehicle: "Hyundai Tucson AWD",
    model: "Tucson AWD",
    year: "2023",
    color: "White",
    mileage: 50000,
    askingPrice: "7500000",
    careOf: "Ahmad Sab",
    regNumber: "DDB-966",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 10,
    vehicle: "Suzuki Alto VXR",
    model: "Alto VXR",
    year: "2022",
    color: "Silver",
    mileage: 61000,
    askingPrice: "2550000",
    careOf: "AL Asr",
    regNumber: "BAX-914",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 11,
    vehicle: "Suzuki Alto VXL AGS",
    model: "Alto VXL AGS",
    year: "2026",
    color: "White",
    mileage: 55,
    askingPrice: "3350000",
    careOf: "AL Asr",
    regNumber: "UNREGISTERED",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 12,
    vehicle: "Honda City 1.2 AT",
    model: "City 1.2 AT",
    year: "2022",
    color: "Silver",
    mileage: 0,
    askingPrice: "4450000",
    careOf: "AL Asr",
    regNumber: "AAG-215",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 13,
    vehicle: "Honda Vezel",
    model: "Vezel",
    year: "2015/19",
    color: "Red Wine",
    mileage: 0,
    askingPrice: "4000000",
    careOf: "AL Asr",
    regNumber: "BH-4188",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 14,
    vehicle: "Toyota Cross",
    model: "Cross",
    year: "2024",
    color: "Black",
    mileage: 45000,
    askingPrice: "8500000",
    careOf: "Umair Sab",
    regNumber: "UNREGISTERED",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 15,
    vehicle: "Toyota Harrier",
    model: "Harrier",
    year: "2014/18/23",
    color: "White",
    mileage: 0,
    askingPrice: "11000000",
    careOf: "AL Asr",
    regNumber: "APF-87",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 16,
    vehicle: "Daihatsu Rocky",
    model: "Rocky",
    year: "2020/25",
    color: "Silver",
    mileage: 92000,
    askingPrice: "5800000",
    careOf: "Umair Sab",
    regNumber: "AXG-038",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 17,
    vehicle: "Joylong Van",
    model: "Van",
    year: "2026",
    color: "White",
    mileage: 0,
    askingPrice: "9799000",
    careOf: "AL Asr",
    regNumber: "UNREGISTERED",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 18,
    vehicle: "Kama SP-Van",
    model: "SP-Van",
    year: "2026",
    color: "White",
    mileage: 0,
    askingPrice: "6499000",
    careOf: "AL Asr",
    regNumber: "UNREGISTERED",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 19,
    vehicle: "Kama Pick-up Truck",
    model: "Pick-up Truck",
    year: "2026",
    color: "White",
    mileage: 0,
    askingPrice: "5089000",
    careOf: "AL Asr",
    regNumber: "UNREGISTERED",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 20,
    vehicle: "Honda City 1.2 Auto",
    model: "City 1.2 Auto",
    year: "2025",
    color: "Black",
    mileage: 12000,
    askingPrice: "4900000",
    careOf: "AL Asr",
    regNumber: "UNREGISTERED",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 21,
    vehicle: "Suzuki Mehran",
    model: "Mehran",
    year: "2014",
    color: "Grey",
    mileage: 120000,
    askingPrice: "850000",
    careOf: "AL Asr",
    regNumber: "MN-622",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 22,
    vehicle: "DFSK",
    model: "2017",
    year: "2017",
    color: "White",
    mileage: 0,
    askingPrice: "1800000",
    careOf: "AL Asr",
    regNumber: "-",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 23,
    vehicle: "Oshan X7",
    model: "X7",
    year: "2022",
    color: "Red",
    mileage: 73000,
    askingPrice: "7500000",
    careOf: "AL Asr",
    regNumber: "AKW-143",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 24,
    vehicle: "Kia Sorento V6",
    model: "Sorento V6",
    year: "2022",
    color: "Black",
    mileage: 41000,
    askingPrice: "9000000",
    careOf: "Umair Sab",
    regNumber: "AKW 073",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 25,
    vehicle: "Jaecoo J7 Premium",
    model: "J7 Premium",
    year: "2026",
    color: "White",
    mileage: 0,
    askingPrice: "10800000",
    careOf: "Imran Sab",
    regNumber: "-",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 26,
    vehicle: "Honda City",
    model: "City",
    year: "2019/20",
    color: "White",
    mileage: 154000,
    askingPrice: "3800000",
    careOf: "Umair Sab",
    regNumber: "-",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 27,
    vehicle: "Honda Civic",
    model: "Civic",
    year: "2021",
    color: "Black",
    mileage: 99000,
    askingPrice: "6200000",
    careOf: "Imran Sab",
    regNumber: "BTL 229",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 28,
    vehicle: "Honda Civic",
    model: "Civic",
    year: "2019",
    color: "Red Wine",
    mileage: 134000,
    askingPrice: "5450000",
    careOf: "Ahsan Sab",
    regNumber: "-",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 29,
    vehicle: "Honda Insight",
    model: "Insight",
    year: "2018/23",
    color: "Red",
    mileage: 74000,
    askingPrice: "8500000",
    careOf: "Azam Sab",
    regNumber: "APH-234",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 30,
    vehicle: "Toyota Raize",
    model: "Raize",
    year: "2020/25",
    color: "Black",
    mileage: 60000,
    askingPrice: "5700000",
    careOf: "Rana Saleem",
    regNumber: "AWD 525",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 31,
    vehicle: "Toyota Surf",
    model: "Surf",
    year: "2003/24",
    color: "White",
    mileage: 138000,
    askingPrice: "8000000",
    careOf: "Umair Sab",
    regNumber: "BFG-945",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 32,
    vehicle: "Toyota CHR Petrol",
    model: "CHR Petrol",
    year: "2018/23",
    color: "White",
    mileage: 154000,
    askingPrice: "7500000",
    careOf: "Umair Sab",
    regNumber: "ATC 987",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  },
  {
    sr: 33,
    vehicle: "Toyota Prado TX",
    model: "Prado TX",
    year: "2016/21",
    color: "Black",
    mileage: 114000,
    askingPrice: "20000000",
    careOf: "AL Asr",
    regNumber: "-",
    status: "AVAILABLE",
    location: "Main Showroom Floor"
  }
];

async function main() {
  console.log('================================================================');
  console.log('IMPORTING SHOWROOM CURRENT STOCK FROM ROOT STOCK PDF');
  console.log('================================================================');

  // Clear existing showroom CurrentStock table
  await prisma.currentStock.deleteMany({});
  console.log('Cleared CurrentStock table.');

  let insertedCount = 0;
  let totalValuation = 0;

  for (const item of stockData) {
    const created = await prisma.currentStock.create({
      data: {
        vehicle: item.vehicle,
        model: item.model,
        year: item.year,
        color: item.color,
        mileage: item.mileage,
        askingPrice: item.askingPrice,
        purchasePrice: '',
        status: item.status,
        location: item.location,
        careOf: item.careOf,
        regNumber: item.regNumber,
        notes: null
      }
    });

    insertedCount++;
    totalValuation += parseInt(item.askingPrice, 10);
    console.log(`[${insertedCount}/33] Inserted: ${created.vehicle} (${created.year}) | Rs. ${Number(created.askingPrice).toLocaleString()} | Care Of: ${created.careOf} | Plate: ${created.regNumber}`);
  }

  console.log(`\n================================================================`);
  console.log(`✅ SUCCESSFULLY IMPORTED ALL ${insertedCount} VEHICLES ACCORDING TO PDF!`);
  console.log(`Total Showroom Valuation: Rs. ${totalValuation.toLocaleString()} (PKR ${totalValuation / 10000000} Crore)`);
  console.log(`================================================================\n`);
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
