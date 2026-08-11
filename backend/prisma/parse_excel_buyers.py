import zipfile
import xml.etree.ElementTree as ET
import json
import re
import datetime
import os

xlsx_path = r'd:\Projects\Projects\Dealership Managment System\AL ASR Motors Inventory Management Sheet.xlsx'

zf = zipfile.ZipFile(xlsx_path)

shared_strings = []
if 'xl/sharedStrings.xml' in zf.namelist():
    sst_tree = ET.fromstring(zf.read('xl/sharedStrings.xml'))
    for si in sst_tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
        t_el = si.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
        if t_el is not None and t_el.text:
            shared_strings.append(t_el.text)
        else:
            text_parts = [t.text for t in si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text]
            shared_strings.append(''.join(text_parts))

def get_sheet_rows(sheet_name):
    wb_tree = ET.fromstring(zf.read('xl/workbook.xml'))
    rel_tree = ET.fromstring(zf.read('xl/_rels/workbook.xml.rels'))
    rel_map = {r.attrib['Id']: r.attrib['Target'] for r in rel_tree.findall('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship')}
    
    sheet_id = None
    for s in wb_tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheets/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet'):
        if s.attrib['name'] == sheet_name:
            sheet_id = s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
            break
    if not sheet_id or sheet_id not in rel_map:
        return []
    target_path = 'xl/' + rel_map[sheet_id].replace('\\', '/')
    if target_path not in zf.namelist():
        return []
    
    sheet_tree = ET.fromstring(zf.read(target_path))
    rows = []
    for r in sheet_tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheetData/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
        row_cells = {}
        for c in r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
            cell_ref = c.attrib['r']
            cell_type = c.attrib.get('t', '')
            val_el = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
            val = val_el.text if val_el is not None else ''
            if cell_type == 's' and val != '':
                val = shared_strings[int(val)] if int(val) < len(shared_strings) else val
            col_let = ''.join([ch for ch in cell_ref if ch.isalpha()])
            row_cells[col_let] = val.strip()
        rows.append(row_cells)
    return rows

BRANDS = [
    'Toyota', 'Honda', 'Suzuki', 'Hyundai', 'Kia', 'BMW', 'Mercedes-Benz', 'Mercedes',
    'Audi', 'Nissan', 'Ford', 'MG', 'Haval', 'Changan', 'Lexus', 'Porsche', 'Peugeot',
    'Daihatsu', 'Mitsubishi', 'Isuzu', 'Subaru', 'Land Rover', 'Range Rover', 'Proton',
    'FAW', 'DFSK', 'Chery', 'BAIC', 'GWM', 'JMC', 'JW Forland'
]

def split_vehicle_specs(raw_vehicle, raw_year_col):
    raw = (raw_vehicle or '').strip()
    year_col = (raw_year_col or '').strip()

    year_match = re.search(r'(20\d\d|19\d\d)', year_col + ' ' + raw)
    year = year_match.group(1) if year_match else '2024'

    make = 'Other'
    for b in BRANDS:
        if re.search(r'\b' + re.escape(b) + r'\b', raw, re.I):
            make = b
            break
    
    if make == 'Other' and raw:
        parts = raw.split()
        make = parts[0]
        model = ' '.join(parts[1:]) if len(parts) > 1 else raw
    else:
        pattern = re.compile(r'\b' + re.escape(make) + r'\b', re.I)
        model = pattern.sub('', raw).strip()
        model = re.sub(r'^[-\s/:]+', '', model).strip()
        if not model:
            model = make

    return make, model, year

MONTH_MAP = {
    'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
    'apr': 4, 'april': 4, 'may': 5, 'june': 6, 'jun': 6, 'july': 7, 'jul': 7,
    'aug': 8, 'august': 8, 'sep': 9, 'september': 9, 'oct': 10, 'october': 10,
    'nov': 11, 'november': 11, 'dec': 12, 'december': 12
}

def parse_excel_date(date_val):
    if not date_val:
        return None
    s = str(date_val).strip()
    if not s or s.lower() in ['registration date', 'date', '-']:
        return None
    try:
        num = float(s)
        if num > 30000 and num < 60000:
            dt = datetime.datetime(1899, 12, 30) + datetime.timedelta(days=num)
            return dt.strftime('%Y-%m-%dT%H:%M:%S.000Z')
    except:
        pass
    
    m_name = re.search(r'(\d{1,2})[-\s/]+([A-Za-z]+)[-\s/]+(\d{4})', s)
    if m_name:
        day = int(m_name.group(1))
        m_str = m_name.group(2).lower()[:3]
        year = int(m_name.group(3))
        if m_str in MONTH_MAP:
            dt = datetime.datetime(year, MONTH_MAP[m_str], day)
            return dt.strftime('%Y-%m-%dT%H:%M:%S.000Z')
            
    parts = re.split(r'[-/.]', s)
    if len(parts) == 3:
        p1, p2, p3 = parts[0].strip(), parts[1].strip(), parts[2].strip()
        try:
            if len(p3) == 4 and len(p1) <= 2:
                dt = datetime.datetime(int(p3), int(p2), int(p1))
                return dt.strftime('%Y-%m-%dT%H:%M:%S.000Z')
            elif len(p1) == 4:
                dt = datetime.datetime(int(p1), int(p2), int(p3))
                return dt.strftime('%Y-%m-%dT%H:%M:%S.000Z')
        except:
            pass
    return None

def parse_price(price_str):
    if not price_str:
        return 0
    s = price_str.strip().lower()
    if 'un-known' in s or 'applied' in s or s == 'any' or 'cash' in s:
        return 0
    if '-' in s:
        s = s.split('-')[0]
    
    crore_m = re.search(r'([\d.]+)\s*(?:crore|cror|cr)', s, re.I)
    lac_m = re.search(r'([\d.]+)\s*(?:lac|lacs|l)', s, re.I)
    
    total = 0
    if crore_m:
        total += float(crore_m.group(1)) * 10000000
    if lac_m:
        total += float(lac_m.group(1)) * 100000
    elif not crore_m and not lac_m:
        num_str = re.sub(r'[^\d.]', '', s)
        try:
            val = float(num_str)
            if val < 500:
                total = val * 100000
            else:
                total = val
        except:
            total = 0
    return round(total)

def format_phone(phone_str):
    if not phone_str:
        return '0300-0000000'
    m = re.search(r'(?:0|92)?(3\d{2})[-\s]?(\d{7})', phone_str)
    if m:
        return f"0{m.group(1)}-{m.group(2)}"
    return '0300-0000000'

def parse_lead_status(status_str):
    if not status_str:
        return 'New Lead'
    s = status_str.strip().lower()
    if 'closed' in s or 'sold' in s or 'finished' in s or 'done' in s:
        return 'Deal Closed'
    if 'ongoing' in s or 'negotiat' in s or 'token' in s:
        return 'Negotiation'
    if 'follow' in s or 'pending' in s or 'call' in s:
        return 'Follow Up'
    if 'contacted' in s or 'talked' in s:
        return 'Contacted'
    if 'interested' in s:
        return 'Interested'
    if 'lost' in s or 'cancel' in s or 'drop' in s:
        return 'Lost'
    if 'incomplete' in s:
        return 'Incomplete'
    return 'New Lead'

all_buyers = []
seen_signatures = set()

target_sheets = ['Daily Buyer', 'Main Buyer', 'Supply (Buyer)']

for sheet in target_sheets:
    rows = get_sheet_rows(sheet)
    for idx, r in enumerate(rows):
        raw_vehicle = r.get('D', '')
        if not raw_vehicle or raw_vehicle.lower() in ['vehicle', 'vehicle name', 'car name'] or len(raw_vehicle) < 2:
            continue
            
        reg_date_raw = r.get('C', '')
        reg_date = parse_excel_date(reg_date_raw)
        
        raw_year = r.get('E', '')
        color = r.get('F', '') or 'Any'
        mileage_str = r.get('G', '')
        budget = parse_price(r.get('H', ''))
        
        buyer_name = r.get('I', '') or f"Buyer #{idx+1}"
        buyer_contact = r.get('J', '')
        buyer_city = r.get('K', '') or 'Sahiwal'
        
        lead_shared_by = r.get('L', '')
        lead_ref = r.get('M', '')
        lead_assigned_to = r.get('N', '')
        lead_status = parse_lead_status(r.get('P', ''))
        comments = r.get('Q', '') or ''
        
        phone = format_phone(buyer_contact)
        make, model, year = split_vehicle_specs(raw_vehicle, raw_year)
        
        sig = f"{make.lower()}|{model.lower()}|{year}|{phone}|{buyer_name.lower().strip()}"
        if sig in seen_signatures:
            continue
        seen_signatures.add(sig)
        
        condition = 'Used'
        if 'zero' in raw_vehicle.lower() or 'zero' in (comments or '').lower() or 'brand new' in (comments or '').lower():
            condition = 'Zero Meter'
            
        all_buyers.append({
            'registrationDate': reg_date,
            'vehicle': make,
            'model': model,
            'year': str(year),
            'color': color.strip() if color else 'Any',
            'mileage': 0,
            'budget': budget,
            'carCondition': condition,
            'zeroMeterType': 'Cash' if condition == 'Zero Meter' else None,
            'buyerName': buyer_name.strip(),
            'buyerPhone': phone,
            'buyerCity': buyer_city.strip() if buyer_city else 'Sahiwal',
            'leadSource': 'Excel Import',
            'leadReference': lead_ref if lead_ref else None,
            'leadReferredBy': lead_shared_by if lead_shared_by else None,
            'assignedToName': lead_assigned_to if lead_assigned_to else None,
            'leadStatus': lead_status,
            'comments': comments.strip() if comments else f"Imported from {sheet}"
        })

output_path = r'd:\Projects\Projects\Dealership Managment System\backend\prisma\buyers_data.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(all_buyers, f, indent=2, ensure_ascii=False)

print(f"DONE: Extracted {len(all_buyers)} cleaned buyer records into {output_path}")
