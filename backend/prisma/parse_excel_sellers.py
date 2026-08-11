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

def parse_year(year_str, vehicle_str):
    text = (year_str or '') + ' ' + (vehicle_str or '')
    m = re.search(r'(20\d\d|19\d\d)', text)
    if m:
        return m.group(1)
    return '2024'

def parse_mileage(mileage_str):
    if not mileage_str:
        return 0
    s = mileage_str.strip().lower()
    if 'un-known' in s or 'applied' in s or '-' in s:
        return 0
    if s.endswith('k'):
        try:
            return int(float(s.replace('k', '')) * 1000)
        except:
            pass
    try:
        val = int(float(re.sub(r'[^\d.]', '', s)))
        if val > 2000000:
            return 0
        return val
    except:
        return 0

def format_phone(phone_str):
    if not phone_str:
        return '0300-0000000'
    m = re.search(r'(?:0|92)?(3\d{2})[-\s]?(\d{7})', phone_str)
    if m:
        return f"0{m.group(1)}-{m.group(2)}"
    return '0300-0000000'

def parse_excel_date(date_val):
    if not date_val:
        return None
    date_str = str(date_val).strip()
    if not date_str or date_str.lower() in ['registration date', 'date', '-']:
        return None
    try:
        num = float(date_str)
        if num > 30000 and num < 60000:
            dt = datetime.datetime(1899, 12, 30) + datetime.timedelta(days=num)
            return dt.strftime('%Y-%m-%dT%H:%M:%S.000Z')
    except:
        pass
    parts = re.split(r'[-/.]', date_str)
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

all_sellers = []
seen_signatures = set()

target_sheets = ['Main Seller', 'Daily Seller', 'Demand (Seller)']

for sheet in target_sheets:
    rows = get_sheet_rows(sheet)
    for idx, r in enumerate(rows):
        vehicle = r.get('D', '')
        if not vehicle or vehicle.lower() in ['vehicle', 'toyota fortuner 2.7 petrol'] or len(vehicle) < 2:
            continue
        
        if vehicle.lower() in ['vehicle name', 'car name', 'vehicle']:
            continue
            
        reg_date_raw = r.get('C', '')
        reg_date = parse_excel_date(reg_date_raw)
        
        model_year = r.get('E', '')
        color = r.get('F', '') or 'White'
        mileage = parse_mileage(r.get('G', ''))
        demand = parse_price(r.get('H', ''))
        
        seller_name = r.get('I', '') or f"Seller #{idx+1}"
        seller_contact = r.get('J', '')
        seller_city = r.get('K', '') or 'Sahiwal'
        
        lead_shared_by = r.get('L', '')
        lead_ref = r.get('M', '')
        lead_assigned_to = r.get('N', '')
        lead_status = parse_lead_status(r.get('P', ''))
        comments = r.get('Q', '') or ''
        
        phone = format_phone(seller_contact)
        year = parse_year(model_year, vehicle)
        
        sig = f"{vehicle.lower().strip()}|{year}|{color.lower().strip()}|{phone}|{seller_name.lower().strip()}"
        if sig in seen_signatures:
            continue
        seen_signatures.add(sig)
        
        condition = 'Used'
        if 'zero' in vehicle.lower() or 'zero' in (comments or '').lower() or 'brand new' in (comments or '').lower():
            condition = 'Zero Meter'
            
        all_sellers.append({
            'registrationDate': reg_date,
            'vehicle': vehicle.strip(),
            'model': (model_year.replace('.0', '').strip() if model_year else ''),
            'year': str(year),
            'color': color.strip() if color else 'White',
            'mileage': mileage,
            'demandPrice': demand,
            'carCondition': condition,
            'zeroMeterType': 'Cash' if condition == 'Zero Meter' else None,
            'sellerName': seller_name.strip(),
            'sellerPhone': phone,
            'sellerCity': seller_city.strip() if seller_city else 'Sahiwal',
            'leadSource': 'Excel Import',
            'leadReference': lead_ref if lead_ref else None,
            'leadReferredBy': lead_shared_by if lead_shared_by else None,
            'assignedToName': lead_assigned_to if lead_assigned_to else None,
            'leadStatus': lead_status,
            'comments': comments.strip() if comments else f"Imported from {sheet}"
        })

output_path = r'd:\Projects\Projects\Dealership Managment System\backend\prisma\sellers_data.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(all_sellers, f, indent=2, ensure_ascii=False)

print(f"DONE: Extracted {len(all_sellers)} seller records with registrationDate into {output_path}")
