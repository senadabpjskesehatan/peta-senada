import React, { useState, useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { SheetRow, ColumnDef } from '../types';
import { 
  MapPin, Globe2, Layers, TrendingUp, TrendingDown, BarChart3, Building2, 
  Compass, Filter, Plus, Pencil, Trash2, X, AlertCircle, CheckCircle2, 
  Info, Search, RefreshCw, Key, ShieldCheck, ExternalLink, ArrowUpDown,
  ZoomIn, ZoomOut, Maximize2, Satellite, Eye, Award, Calculator, Hash, 
  Sigma, CheckCheck, Sparkles
} from 'lucide-react';

export interface RegionDetail {
  id: string;
  name: string; // nmkckeluhan / Kantor Cabang / Kabupaten / Kota
  island: string; // Sumatra, Jawa, Kalimantan, Sulawesi, Papua, Bali, NTT, NTB, Flores
  utilizationCount: number;
  rowCount: number;
  sumValue: number;
  percentage: number;
  status: 'Tinggi' | 'Sedang' | 'Rendah';
  description: string;
  lat: number;
  lng: number;
}

interface IndonesiaMapCardProps {
  rows: SheetRow[];
  allRows?: SheetRow[];
  columns: ColumnDef[];
  selectedRegionFilter?: string[];
  onSelectRegionFilter?: (regionName: string) => void;
  onResetRegionFilter?: () => void;
  onClose?: () => void;
}

// Clean number parser handling Indonesian formatting (1.250 or 1.250,50) and standard (1,250.50)
function parseCleanNumber(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  let str = String(val).trim();
  // Strip currency prefixes/suffixes
  str = str.replace(/^(rp|idr|\$|€|£)\s*/i, '').trim();
  
  // Detect Indonesian thousands notation e.g. "1.250" or "1.250,50"
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(str)) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(str)) {
    // English notation: "1,250" or "1,250.50"
    str = str.replace(/,/g, '');
  } else {
    // Single comma with no dots -> replace with decimal dot
    if (str.includes(',') && !str.includes('.')) {
      str = str.replace(',', '.');
    }
    str = str.replace(/[^0-9.-]/g, '');
  }
  
  const parsed = Number(str);
  return isNaN(parsed) ? 0 : parsed;
}

// Comprehensive Regency/City & KC Geocoding reference across Indonesian Archipelago
const INDONESIA_KAB_KOTA_GEOCODING: Record<string, { island: string; lat: number; lng: number }> = {
  // Sumatra
  'banda aceh': { island: 'Sumatra', lat: 5.5483, lng: 95.3238 },
  'aceh besar': { island: 'Sumatra', lat: 5.3833, lng: 95.5167 },
  'sabang': { island: 'Sumatra', lat: 5.8933, lng: 95.3200 },
  'lhokseumawe': { island: 'Sumatra', lat: 5.1801, lng: 97.1407 },
  'langsa': { island: 'Sumatra', lat: 4.4724, lng: 97.9654 },
  'aceh utara': { island: 'Sumatra', lat: 4.9833, lng: 97.1167 },
  'aceh timur': { island: 'Sumatra', lat: 4.6333, lng: 97.6167 },
  'aceh tengah': { island: 'Sumatra', lat: 4.6000, lng: 96.8500 },
  'takengon': { island: 'Sumatra', lat: 4.6294, lng: 96.8444 },
  'aceh barat': { island: 'Sumatra', lat: 4.4500, lng: 96.1667 },
  'meulaboh': { island: 'Sumatra', lat: 4.1444, lng: 96.1286 },
  'aceh selatan': { island: 'Sumatra', lat: 3.3500, lng: 97.2667 },
  'tapaktuan': { island: 'Sumatra', lat: 3.2567, lng: 97.1794 },
  'bireuen': { island: 'Sumatra', lat: 5.2000, lng: 96.7000 },
  'pidie': { island: 'Sumatra', lat: 5.1500, lng: 95.9500 },
  'sigli': { island: 'Sumatra', lat: 5.3853, lng: 95.9592 },
  'medan': { island: 'Sumatra', lat: 3.5952, lng: 98.6722 },
  'deli serdang': { island: 'Sumatra', lat: 3.5552, lng: 98.7189 },
  'lubuk pakam': { island: 'Sumatra', lat: 3.5606, lng: 98.8789 },
  'binjai': { island: 'Sumatra', lat: 3.6006, lng: 98.4854 },
  'tebing tinggi': { island: 'Sumatra', lat: 3.3285, lng: 99.1625 },
  'pematangsiantar': { island: 'Sumatra', lat: 2.9599, lng: 99.0687 },
  'siantar': { island: 'Sumatra', lat: 2.9599, lng: 99.0687 },
  'simalungun': { island: 'Sumatra', lat: 2.9000, lng: 99.0000 },
  'kabanjahe': { island: 'Sumatra', lat: 3.1778, lng: 98.4908 },
  'karo': { island: 'Sumatra', lat: 3.1167, lng: 98.3000 },
  'asahan': { island: 'Sumatra', lat: 2.9833, lng: 99.6333 },
  'kisaran': { island: 'Sumatra', lat: 2.9839, lng: 99.6192 },
  'tanjung balai': { island: 'Sumatra', lat: 2.9583, lng: 99.8000 },
  'labuhanbatu': { island: 'Sumatra', lat: 2.1500, lng: 100.0000 },
  'rantau prapat': { island: 'Sumatra', lat: 2.0967, lng: 99.8286 },
  'tapanuli utara': { island: 'Sumatra', lat: 2.0000, lng: 99.0000 },
  'tarutung': { island: 'Sumatra', lat: 2.0231, lng: 98.9669 },
  'tapanuli tengah': { island: 'Sumatra', lat: 1.8500, lng: 98.7000 },
  'sibolga': { island: 'Sumatra', lat: 1.7428, lng: 98.7792 },
  'tapanuli selatan': { island: 'Sumatra', lat: 1.5000, lng: 99.2500 },
  'padangsidimpuan': { island: 'Sumatra', lat: 1.3739, lng: 99.2731 },
  'toba': { island: 'Sumatra', lat: 2.4000, lng: 99.2000 },
  'balige': { island: 'Sumatra', lat: 2.3333, lng: 99.0667 },
  'humbang hasundutan': { island: 'Sumatra', lat: 2.2500, lng: 98.7000 },
  'dolok sanggul': { island: 'Sumatra', lat: 2.2583, lng: 98.7472 },
  'samosir': { island: 'Sumatra', lat: 2.6000, lng: 98.7000 },
  'pangururan': { island: 'Sumatra', lat: 2.6078, lng: 98.7042 },
  'nias': { island: 'Sumatra', lat: 1.1500, lng: 97.6000 },
  'gunungsitoli': { island: 'Sumatra', lat: 1.2828, lng: 97.6150 },
  'padang': { island: 'Sumatra', lat: -0.9471, lng: 100.4172 },
  'bukittinggi': { island: 'Sumatra', lat: -0.3056, lng: 100.3692 },
  'padang panjang': { island: 'Sumatra', lat: -0.4636, lng: 100.3986 },
  'pariaman': { island: 'Sumatra', lat: -0.6264, lng: 100.1203 },
  'padang pariaman': { island: 'Sumatra', lat: -0.5500, lng: 100.2500 },
  'solok': { island: 'Sumatra', lat: -0.7989, lng: 100.6539 },
  'sawahlunto': { island: 'Sumatra', lat: -0.6806, lng: 100.7761 },
  'payakumbuh': { island: 'Sumatra', lat: -0.2247, lng: 100.6328 },
  'lima puluh kota': { island: 'Sumatra', lat: -0.1500, lng: 100.6000 },
  'agam': { island: 'Sumatra', lat: -0.2500, lng: 100.1500 },
  'lubuk basung': { island: 'Sumatra', lat: -0.3061, lng: 100.0658 },
  'pasaman': { island: 'Sumatra', lat: 0.1500, lng: 100.1500 },
  'pasaman barat': { island: 'Sumatra', lat: 0.2000, lng: 99.8000 },
  'simpang empat': { island: 'Sumatra', lat: 0.0886, lng: 99.8144 },
  'pesisir selatan': { island: 'Sumatra', lat: -1.3500, lng: 100.5500 },
  'painan': { island: 'Sumatra', lat: -1.3517, lng: 100.5750 },
  'tanah datar': { island: 'Sumatra', lat: -0.4500, lng: 100.5833 },
  'batusangkar': { island: 'Sumatra', lat: -0.4467, lng: 100.5967 },
  'sijunjung': { island: 'Sumatra', lat: -0.6833, lng: 101.3167 },
  'dharmasraya': { island: 'Sumatra', lat: -1.0500, lng: 101.6000 },
  'pulau punjung': { island: 'Sumatra', lat: -0.9856, lng: 101.5317 },
  'solok selatan': { island: 'Sumatra', lat: -1.5000, lng: 101.2500 },
  'pekanbaru': { island: 'Sumatra', lat: 0.5071, lng: 101.4478 },
  'dumai': { island: 'Sumatra', lat: 1.6671, lng: 101.4484 },
  'kampar': { island: 'Sumatra', lat: 0.3333, lng: 101.0333 },
  'bangkinang': { island: 'Sumatra', lat: 0.3339, lng: 101.0256 },
  'siak': { island: 'Sumatra', lat: 0.7833, lng: 101.7167 },
  'siak sri indrapura': { island: 'Sumatra', lat: 0.7933, lng: 102.0494 },
  'pelalawan': { island: 'Sumatra', lat: 0.2500, lng: 102.0000 },
  'pangkalan kerinci': { island: 'Sumatra', lat: 0.4042, lng: 101.8594 },
  'indragiri hulu': { island: 'Sumatra', lat: -0.5500, lng: 102.3000 },
  'rengat': { island: 'Sumatra', lat: -0.3756, lng: 102.5483 },
  'indragiri hilir': { island: 'Sumatra', lat: -0.3333, lng: 103.1667 },
  'tembilahan': { island: 'Sumatra', lat: -0.3208, lng: 103.1583 },
  'bengkalis': { island: 'Sumatra', lat: 1.4833, lng: 102.0833 },
  'rokan hulu': { island: 'Sumatra', lat: 0.8500, lng: 100.5000 },
  'pasir pengaraian': { island: 'Sumatra', lat: 0.8542, lng: 100.3017 },
  'rokan hilir': { island: 'Sumatra', lat: 2.1500, lng: 100.8000 },
  'bagansiapiapi': { island: 'Sumatra', lat: 2.1606, lng: 100.8094 },
  'kuantan singingi': { island: 'Sumatra', lat: -0.5000, lng: 101.4500 },
  'teluk kuantan': { island: 'Sumatra', lat: -0.5369, lng: 101.5647 },
  'meranti': { island: 'Sumatra', lat: 0.9500, lng: 102.7000 },
  'selatpanjang': { island: 'Sumatra', lat: 1.0117, lng: 102.7083 },
  'batam': { island: 'Sumatra', lat: 1.1301, lng: 104.0529 },
  'tanjung pinang': { island: 'Sumatra', lat: 0.9167, lng: 104.4500 },
  'bintan': { island: 'Sumatra', lat: 1.0000, lng: 104.5000 },
  'karimun': { island: 'Sumatra', lat: 1.0500, lng: 103.4000 },
  'tanjung balai karimun': { island: 'Sumatra', lat: 0.9939, lng: 103.4278 },
  'natuna': { island: 'Sumatra', lat: 3.9000, lng: 108.2500 },
  'ranai': { island: 'Sumatra', lat: 3.9392, lng: 108.3842 },
  'anambas': { island: 'Sumatra', lat: 3.1000, lng: 106.0000 },
  'tarempa': { island: 'Sumatra', lat: 3.2208, lng: 106.2197 },
  'lingga': { island: 'Sumatra', lat: -0.2000, lng: 104.6000 },
  'dabo singkep': { island: 'Sumatra', lat: -0.4939, lng: 104.5683 },
  'jambi': { island: 'Sumatra', lat: -1.6101, lng: 103.6131 },
  'muaro jambi': { island: 'Sumatra', lat: -1.5000, lng: 103.8000 },
  'sengeti': { island: 'Sumatra', lat: -1.4111, lng: 103.5858 },
  'batanghari': { island: 'Sumatra', lat: -1.7500, lng: 103.2000 },
  'muara bulian': { island: 'Sumatra', lat: -1.7317, lng: 103.2750 },
  'sarolangun': { island: 'Sumatra', lat: -2.3000, lng: 102.6500 },
  'merangin': { island: 'Sumatra', lat: -2.1000, lng: 102.1000 },
  'bangko': { island: 'Sumatra', lat: -2.0631, lng: 102.2689 },
  'bungo': { island: 'Sumatra', lat: -1.5000, lng: 101.9500 },
  'muara bungo': { island: 'Sumatra', lat: -1.4947, lng: 102.1158 },
  'tebo': { island: 'Sumatra', lat: -1.4500, lng: 102.4000 },
  'muara tebo': { island: 'Sumatra', lat: -1.4722, lng: 102.4417 },
  'kerinci': { island: 'Sumatra', lat: -2.0833, lng: 101.4833 },
  'sungai penuh': { island: 'Sumatra', lat: -2.0600, lng: 101.3900 },
  'tanjung jabung barat': { island: 'Sumatra', lat: -1.1500, lng: 103.3500 },
  'kuala tungkal': { island: 'Sumatra', lat: -0.8167, lng: 103.4667 },
  'tanjung jabung timur': { island: 'Sumatra', lat: -1.2500, lng: 103.8500 },
  'muara sabak': { island: 'Sumatra', lat: -1.1528, lng: 103.8586 },
  'palembang': { island: 'Sumatra', lat: -2.9761, lng: 104.7754 },
  'ogan ilir': { island: 'Sumatra', lat: -3.4500, lng: 104.6000 },
  'indralaya': { island: 'Sumatra', lat: -3.2289, lng: 104.6531 },
  'ogan komering ilir': { island: 'Sumatra', lat: -3.4000, lng: 105.1000 },
  'kayu agung': { island: 'Sumatra', lat: -3.3931, lng: 104.8622 },
  'kayuagung': { island: 'Sumatra', lat: -3.3931, lng: 104.8622 },
  'ogan komering ulu': { island: 'Sumatra', lat: -4.1333, lng: 104.1667 },
  'baturaja': { island: 'Sumatra', lat: -4.1306, lng: 104.1750 },
  'oku timur': { island: 'Sumatra', lat: -3.8500, lng: 104.7500 },
  'martapura oku': { island: 'Sumatra', lat: -4.2467, lng: 104.3481 },
  'martapura sumsel': { island: 'Sumatra', lat: -4.2467, lng: 104.3481 },
  'oku selatan': { island: 'Sumatra', lat: -4.6500, lng: 104.0000 },
  'muaradua': { island: 'Sumatra', lat: -4.5167, lng: 104.0167 },
  'prabumulih': { island: 'Sumatra', lat: -3.4358, lng: 104.2381 },
  'muara enim': { island: 'Sumatra', lat: -3.6500, lng: 103.7833 },
  'lahat': { island: 'Sumatra', lat: -3.7833, lng: 103.5333 },
  'pagar alam': { island: 'Sumatra', lat: -4.0278, lng: 103.2681 },
  'empat lawang': { island: 'Sumatra', lat: -3.7000, lng: 102.9500 },
  'musi banyuasin': { island: 'Sumatra', lat: -2.5000, lng: 103.8000 },
  'sekayu': { island: 'Sumatra', lat: -2.8833, lng: 103.8333 },
  'banyuasin': { island: 'Sumatra', lat: -2.6000, lng: 104.6000 },
  'pangkalan balai': { island: 'Sumatra', lat: -2.8942, lng: 104.3808 },
  'musi rawas': { island: 'Sumatra', lat: -3.0000, lng: 103.0000 },
  'lubuklinggau': { island: 'Sumatra', lat: -3.2969, lng: 102.8619 },
  'lubuk linggau': { island: 'Sumatra', lat: -3.2969, lng: 102.8619 },
  'muratara': { island: 'Sumatra', lat: -2.7500, lng: 102.8500 },
  'muara rupit': { island: 'Sumatra', lat: -2.7486, lng: 102.8817 },
  'penukal abab lematang ilir': { island: 'Sumatra', lat: -3.2500, lng: 103.9500 },
  'pali': { island: 'Sumatra', lat: -3.2500, lng: 103.9500 },
  'talang ubi': { island: 'Sumatra', lat: -3.2917, lng: 103.8447 },
  'bengkulu': { island: 'Sumatra', lat: -3.7928, lng: 102.2608 },
  'bengkulu utara': { island: 'Sumatra', lat: -3.4000, lng: 102.1500 },
  'arga makmur': { island: 'Sumatra', lat: -3.4358, lng: 102.1814 },
  'bengkulu selatan': { island: 'Sumatra', lat: -4.3500, lng: 103.0000 },
  'manna': { island: 'Sumatra', lat: -4.4756, lng: 102.9069 },
  'rejang lebong': { island: 'Sumatra', lat: -3.4500, lng: 102.5500 },
  'curup': { island: 'Sumatra', lat: -3.4739, lng: 102.5278 },
  'kepahiang': { island: 'Sumatra', lat: -3.6467, lng: 102.5800 },
  'lebong': { island: 'Sumatra', lat: -3.1500, lng: 102.2500 },
  'tubei': { island: 'Sumatra', lat: -3.1481, lng: 102.3275 },
  'seluma': { island: 'Sumatra', lat: -4.0500, lng: 102.6000 },
  'pasar tais': { island: 'Sumatra', lat: -4.0433, lng: 102.5117 },
  'kaur': { island: 'Sumatra', lat: -4.7500, lng: 103.3500 },
  'bintuhan': { island: 'Sumatra', lat: -4.7708, lng: 103.3644 },
  'mukomuko': { island: 'Sumatra', lat: -2.5833, lng: 101.1167 },
  'muko muko': { island: 'Sumatra', lat: -2.5833, lng: 101.1167 },
  'bengkulu tengah': { island: 'Sumatra', lat: -3.7500, lng: 102.4000 },
  'karang tinggi': { island: 'Sumatra', lat: -3.7431, lng: 102.4489 },
  'bandar lampung': { island: 'Sumatra', lat: -5.3971, lng: 105.2668 },
  'tanjung karang': { island: 'Sumatra', lat: -5.4167, lng: 105.2500 },
  'metro': { island: 'Sumatra', lat: -5.1133, lng: 105.3067 },
  'lampung selatan': { island: 'Sumatra', lat: -5.6000, lng: 105.6000 },
  'kalianda': { island: 'Sumatra', lat: -5.7333, lng: 105.6167 },
  'lampung tengah': { island: 'Sumatra', lat: -4.8500, lng: 105.2500 },
  'gunung sugih': { island: 'Sumatra', lat: -4.9583, lng: 105.2167 },
  'lampung timur': { island: 'Sumatra', lat: -5.1000, lng: 105.7000 },
  'sukadana': { island: 'Sumatra', lat: -5.0833, lng: 105.5500 },
  'lampung utara': { island: 'Sumatra', lat: -4.8000, lng: 104.8500 },
  'kotabumi': { island: 'Sumatra', lat: -4.8256, lng: 104.8872 },
  'lampung barat': { island: 'Sumatra', lat: -5.0000, lng: 104.2000 },
  'liwa': { island: 'Sumatra', lat: -5.0381, lng: 104.0725 },
  'tulang bawang': { island: 'Sumatra', lat: -4.4000, lng: 105.5000 },
  'menggala': { island: 'Sumatra', lat: -4.4447, lng: 105.2444 },
  'tanggamus': { island: 'Sumatra', lat: -5.4500, lng: 104.6500 },
  'kota agung': { island: 'Sumatra', lat: -5.5000, lng: 104.6167 },
  'way kanan': { island: 'Sumatra', lat: -4.5000, lng: 104.5000 },
  'blambangan umpu': { island: 'Sumatra', lat: -4.4939, lng: 104.5306 },
  'pesawaran': { island: 'Sumatra', lat: -5.4500, lng: 105.1500 },
  'gedong tataan': { island: 'Sumatra', lat: -5.3908, lng: 105.1539 },
  'pringsewu': { island: 'Sumatra', lat: -5.3589, lng: 104.9753 },
  'mesuji': { island: 'Sumatra', lat: -3.9500, lng: 105.4000 },
  'wiralaga mulya': { island: 'Sumatra', lat: -3.9875, lng: 105.4192 },
  'tulang bawang barat': { island: 'Sumatra', lat: -4.4500, lng: 105.0500 },
  'panaragan jaya': { island: 'Sumatra', lat: -4.4697, lng: 105.1097 },
  'pesisir barat': { island: 'Sumatra', lat: -5.2000, lng: 103.9500 },
  'krui': { island: 'Sumatra', lat: -5.1964, lng: 103.9314 },
  'pangkal pinang': { island: 'Sumatra', lat: -2.1290, lng: 106.1139 },
  'bangka': { island: 'Sumatra', lat: -1.9000, lng: 105.9000 },
  'sungailiat': { island: 'Sumatra', lat: -1.8594, lng: 106.1186 },
  'bangka barat': { island: 'Sumatra', lat: -1.7500, lng: 105.5000 },
  'muntok': { island: 'Sumatra', lat: -2.0667, lng: 105.1667 },
  'mentok': { island: 'Sumatra', lat: -2.0667, lng: 105.1667 },
  'bangka tengah': { island: 'Sumatra', lat: -2.3500, lng: 106.1500 },
  'koba': { island: 'Sumatra', lat: -2.4833, lng: 106.2167 },
  'bangka selatan': { island: 'Sumatra', lat: -2.8500, lng: 106.1500 },
  'toboali': { island: 'Sumatra', lat: -3.0167, lng: 106.4500 },
  'belitung': { island: 'Sumatra', lat: -2.7500, lng: 107.7000 },
  'tanjung pandan': { island: 'Sumatra', lat: -2.7333, lng: 107.6333 },
  'belitung timur': { island: 'Sumatra', lat: -2.9000, lng: 108.1500 },
  'manggar': { island: 'Sumatra', lat: -2.8833, lng: 108.2667 },
  
  // Jawa
  'jakarta': { island: 'Jawa', lat: -6.2088, lng: 106.8456 },
  'dki jakarta': { island: 'Jawa', lat: -6.2088, lng: 106.8456 },
  'jakarta pusat': { island: 'Jawa', lat: -6.1805, lng: 106.8284 },
  'jakarta selatan': { island: 'Jawa', lat: -6.2615, lng: 106.8106 },
  'jakarta timur': { island: 'Jawa', lat: -6.2250, lng: 106.9004 },
  'jakarta barat': { island: 'Jawa', lat: -6.1683, lng: 106.7589 },
  'jakarta utara': { island: 'Jawa', lat: -6.1384, lng: 106.8640 },
  'kebayoran baru': { island: 'Jawa', lat: -6.2444, lng: 106.7978 },
  'kebayoran lama': { island: 'Jawa', lat: -6.2417, lng: 106.7725 },
  'cilandak': { island: 'Jawa', lat: -6.2917, lng: 106.8000 },
  'pasar minggu': { island: 'Jawa', lat: -6.2889, lng: 106.8417 },
  'mampang prapatan': { island: 'Jawa', lat: -6.2500, lng: 106.8333 },
  'tebet': { island: 'Jawa', lat: -6.2300, lng: 106.8550 },
  'setiabudi': { island: 'Jawa', lat: -6.2167, lng: 106.8300 },
  'matraman': { island: 'Jawa', lat: -6.2000, lng: 106.8600 },
  'jatinegara': { island: 'Jawa', lat: -6.2300, lng: 106.8800 },
  'rawamangun': { island: 'Jawa', lat: -6.1950, lng: 106.8900 },
  'kelapa gading': { island: 'Jawa', lat: -6.1600, lng: 106.9100 },
  'tanjung priok': { island: 'Jawa', lat: -6.1200, lng: 106.8800 },
  'pluit': { island: 'Jawa', lat: -6.1200, lng: 106.7800 },
  'grogol': { island: 'Jawa', lat: -6.1650, lng: 106.7880 },
  'puri kembangan': { island: 'Jawa', lat: -6.1850, lng: 106.7350 },
  'kepulauan seribu': { island: 'Jawa', lat: -5.6000, lng: 106.5500 },
  'bogor': { island: 'Jawa', lat: -6.5971, lng: 106.8060 },
  'kabupaten bogor': { island: 'Jawa', lat: -6.5500, lng: 106.8500 },
  'cibinong': { island: 'Jawa', lat: -6.4817, lng: 106.8544 },
  'depok': { island: 'Jawa', lat: -6.4025, lng: 106.7942 },
  'cinere': { island: 'Jawa', lat: -6.3300, lng: 106.7800 },
  'tangerang': { island: 'Jawa', lat: -6.1783, lng: 106.6319 },
  'tangerang selatan': { island: 'Jawa', lat: -6.2889, lng: 106.7179 },
  'tangsel': { island: 'Jawa', lat: -6.2889, lng: 106.7179 },
  'bsd': { island: 'Jawa', lat: -6.3000, lng: 106.6800 },
  'serpong': { island: 'Jawa', lat: -6.3150, lng: 106.6700 },
  'ciputat': { island: 'Jawa', lat: -6.3117, lng: 106.7461 },
  'pamulang': { island: 'Jawa', lat: -6.3422, lng: 106.7317 },
  'bintaro': { island: 'Jawa', lat: -6.2800, lng: 106.7200 },
  'tigaraksa': { island: 'Jawa', lat: -6.2750, lng: 106.4789 },
  'kabupaten tangerang': { island: 'Jawa', lat: -6.2000, lng: 106.5000 },
  'bekasi': { island: 'Jawa', lat: -6.2383, lng: 106.9756 },
  'kabupaten bekasi': { island: 'Jawa', lat: -6.2800, lng: 107.1500 },
  'cikarang': { island: 'Jawa', lat: -6.3156, lng: 107.1692 },
  'serang': { island: 'Jawa', lat: -6.1200, lng: 106.1503 },
  'ciruas': { island: 'Jawa', lat: -6.1264, lng: 106.2239 },
  'cilegon': { island: 'Jawa', lat: -6.0174, lng: 106.0538 },
  'pandeglang': { island: 'Jawa', lat: -6.3083, lng: 106.1067 },
  'lebak': { island: 'Jawa', lat: -6.5500, lng: 106.2500 },
  'rangkasbitung': { island: 'Jawa', lat: -6.3578, lng: 106.2483 },
  'bandung': { island: 'Jawa', lat: -6.9175, lng: 107.6191 },
  'kabupaten bandung': { island: 'Jawa', lat: -7.0500, lng: 107.5500 },
  'soreang': { island: 'Jawa', lat: -7.0275, lng: 107.5186 },
  'bandung barat': { island: 'Jawa', lat: -6.8439, lng: 107.4925 },
  'ngamprah': { island: 'Jawa', lat: -6.8533, lng: 107.5014 },
  'padalarang': { island: 'Jawa', lat: -6.8378, lng: 107.4789 },
  'cimahi': { island: 'Jawa', lat: -6.8723, lng: 107.5420 },
  'sumedang': { island: 'Jawa', lat: -6.8589, lng: 107.9267 },
  'garut': { island: 'Jawa', lat: -7.2167, lng: 107.9000 },
  'tasikmalaya': { island: 'Jawa', lat: -7.3274, lng: 108.2207 },
  'singaparna': { island: 'Jawa', lat: -7.3500, lng: 108.1167 },
  'ciamis': { island: 'Jawa', lat: -7.3256, lng: 108.3533 },
  'banjar': { island: 'Jawa', lat: -7.3694, lng: 108.5333 },
  'pangandaran': { island: 'Jawa', lat: -7.7000, lng: 108.6500 },
  'cirebon': { island: 'Jawa', lat: -6.7320, lng: 108.5523 },
  'sumber': { island: 'Jawa', lat: -6.7600, lng: 108.4800 },
  'kuningan': { island: 'Jawa', lat: -6.9758, lng: 108.4839 },
  'indramayu': { island: 'Jawa', lat: -6.3264, lng: 108.3200 },
  'majalengka': { island: 'Jawa', lat: -6.8361, lng: 108.2278 },
  'subang': { island: 'Jawa', lat: -6.5689, lng: 107.7600 },
  'purwakarta': { island: 'Jawa', lat: -6.5569, lng: 107.4433 },
  'karawang': { island: 'Jawa', lat: -6.3072, lng: 107.3069 },
  'sukabumi': { island: 'Jawa', lat: -6.9277, lng: 106.9300 },
  'palabuhanratu': { island: 'Jawa', lat: -6.9867, lng: 106.5417 },
  'cianjur': { island: 'Jawa', lat: -6.8222, lng: 107.1394 },
  'semarang': { island: 'Jawa', lat: -7.0051, lng: 110.4381 },
  'ungaran': { island: 'Jawa', lat: -7.1394, lng: 110.4039 },
  'salatiga': { island: 'Jawa', lat: -7.3306, lng: 110.5083 },
  'kendal': { island: 'Jawa', lat: -6.9211, lng: 110.2039 },
  'demak': { island: 'Jawa', lat: -6.8944, lng: 110.6389 },
  'grobogan': { island: 'Jawa', lat: -7.1000, lng: 110.9000 },
  'purwodadi': { island: 'Jawa', lat: -7.0867, lng: 110.9167 },
  'blora': { island: 'Jawa', lat: -6.9694, lng: 111.4183 },
  'cepu': { island: 'Jawa', lat: -7.1500, lng: 111.5833 },
  'rembang': { island: 'Jawa', lat: -6.7100, lng: 111.3400 },
  'pati': { island: 'Jawa', lat: -6.7558, lng: 111.0378 },
  'kudus': { island: 'Jawa', lat: -6.8048, lng: 110.8405 },
  'jepara': { island: 'Jawa', lat: -6.5889, lng: 110.6689 },
  'surakarta': { island: 'Jawa', lat: -7.5755, lng: 110.8243 },
  'solo': { island: 'Jawa', lat: -7.5755, lng: 110.8243 },
  'sukoharjo': { island: 'Jawa', lat: -7.6833, lng: 110.8333 },
  'karanganyar': { island: 'Jawa', lat: -7.5967, lng: 110.9514 },
  'sragen': { island: 'Jawa', lat: -7.4267, lng: 111.0219 },
  'boyolali': { island: 'Jawa', lat: -7.5333, lng: 110.6000 },
  'klaten': { island: 'Jawa', lat: -7.7058, lng: 110.6042 },
  'wonogiri': { island: 'Jawa', lat: -7.8167, lng: 110.9333 },
  'magelang': { island: 'Jawa', lat: -7.4797, lng: 110.2177 },
  'mungkid': { island: 'Jawa', lat: -7.5833, lng: 110.2333 },
  'temanggung': { island: 'Jawa', lat: -7.3167, lng: 110.1667 },
  'wonosobo': { island: 'Jawa', lat: -7.3639, lng: 109.9000 },
  'purworejo': { island: 'Jawa', lat: -7.7167, lng: 110.0167 },
  'kebumen': { island: 'Jawa', lat: -7.6711, lng: 109.6539 },
  'banyumas': { island: 'Jawa', lat: -7.5146, lng: 109.2941 },
  'purwokerto': { island: 'Jawa', lat: -7.4243, lng: 109.2302 },
  'cilacap': { island: 'Jawa', lat: -7.7278, lng: 109.0069 },
  'purbalingga': { island: 'Jawa', lat: -7.3889, lng: 109.3639 },
  'banjarnegara': { island: 'Jawa', lat: -7.3967, lng: 109.6967 },
  'pekalongan': { island: 'Jawa', lat: -6.8886, lng: 109.6753 },
  'kajen': { island: 'Jawa', lat: -7.0333, lng: 109.6167 },
  'batang': { island: 'Jawa', lat: -6.9089, lng: 109.7300 },
  'pemalang': { island: 'Jawa', lat: -6.8906, lng: 109.3806 },
  'tegal': { island: 'Jawa', lat: -6.8694, lng: 109.1402 },
  'slawi': { island: 'Jawa', lat: -6.9856, lng: 109.1367 },
  'brebes': { island: 'Jawa', lat: -6.8700, lng: 109.0433 },
  'bumiayu': { island: 'Jawa', lat: -7.2500, lng: 109.0000 },
  'yogyakarta': { island: 'Jawa', lat: -7.7956, lng: 110.3695 },
  'jogja': { island: 'Jawa', lat: -7.7956, lng: 110.3695 },
  'sleman': { island: 'Jawa', lat: -7.6896, lng: 110.3444 },
  'bantul': { island: 'Jawa', lat: -7.8890, lng: 110.3298 },
  'kulon progo': { island: 'Jawa', lat: -7.7833, lng: 110.1500 },
  'wates': { island: 'Jawa', lat: -7.8578, lng: 110.1600 },
  'gunungkidul': { island: 'Jawa', lat: -7.9667, lng: 110.6000 },
  'wonosari': { island: 'Jawa', lat: -7.9658, lng: 110.6033 },
  'surabaya': { island: 'Jawa', lat: -7.2575, lng: 112.7521 },
  'sidoarjo': { island: 'Jawa', lat: -7.4478, lng: 112.7183 },
  'gresik': { island: 'Jawa', lat: -7.1566, lng: 112.6555 },
  'mojokerto': { island: 'Jawa', lat: -7.4725, lng: 112.4339 },
  'mojosari': { island: 'Jawa', lat: -7.5083, lng: 112.5583 },
  'jombang': { island: 'Jawa', lat: -7.5461, lng: 112.2331 },
  'lamongan': { island: 'Jawa', lat: -7.1211, lng: 112.4144 },
  'tuban': { island: 'Jawa', lat: -6.8978, lng: 112.0644 },
  'bojonegoro': { island: 'Jawa', lat: -7.1500, lng: 111.8817 },
  'madiun': { island: 'Jawa', lat: -7.6298, lng: 111.5239 },
  'caruban': { island: 'Jawa', lat: -7.5500, lng: 111.6667 },
  'magetan': { island: 'Jawa', lat: -7.6492, lng: 111.3283 },
  'ngawi': { island: 'Jawa', lat: -7.4042, lng: 111.4456 },
  'ponorogo': { island: 'Jawa', lat: -7.8686, lng: 111.4628 },
  'pacitan': { island: 'Jawa', lat: -8.2064, lng: 111.0939 },
  'kediri': { island: 'Jawa', lat: -7.8480, lng: 112.0178 },
  'pare': { island: 'Jawa', lat: -7.7667, lng: 112.1833 },
  'nganjuk': { island: 'Jawa', lat: -7.6044, lng: 111.9042 },
  'blitar': { island: 'Jawa', lat: -8.0983, lng: 112.1681 },
  'kanigoro': { island: 'Jawa', lat: -8.1306, lng: 112.2150 },
  'tulungagung': { island: 'Jawa', lat: -8.0667, lng: 111.9000 },
  'trenggalek': { island: 'Jawa', lat: -8.0500, lng: 111.7167 },
  'malang': { island: 'Jawa', lat: -7.9666, lng: 112.6326 },
  'kepanjen': { island: 'Jawa', lat: -8.1333, lng: 112.5667 },
  'batu': { island: 'Jawa', lat: -7.8700, lng: 112.5272 },
  'pasuruan': { island: 'Jawa', lat: -7.6453, lng: 112.9075 },
  'bangil': { island: 'Jawa', lat: -7.6000, lng: 112.7667 },
  'probolinggo': { island: 'Jawa', lat: -7.7543, lng: 113.2159 },
  'kraksaan': { island: 'Jawa', lat: -7.7600, lng: 113.4300 },
  'lumajang': { island: 'Jawa', lat: -8.1333, lng: 113.2167 },
  'jember': { island: 'Jawa', lat: -8.1724, lng: 113.7007 },
  'bondowoso': { island: 'Jawa', lat: -7.9139, lng: 113.8214 },
  'situbondo': { island: 'Jawa', lat: -7.7064, lng: 114.0044 },
  'banyuwangi': { island: 'Jawa', lat: -8.2192, lng: 114.3692 },
  'bangkalan': { island: 'Jawa', lat: -7.0306, lng: 112.7486 },
  'sampang': { island: 'Jawa', lat: -7.1878, lng: 113.2394 },
  'pamekasan': { island: 'Jawa', lat: -7.1583, lng: 113.4739 },
  'sumenep': { island: 'Jawa', lat: -7.0167, lng: 113.8667 },
  'madura': { island: 'Jawa', lat: -7.0500, lng: 113.2500 },

  // Kalimantan
  'pontianak': { island: 'Kalimantan', lat: -0.0263, lng: 109.3425 },
  'kubu raya': { island: 'Kalimantan', lat: -0.1000, lng: 109.4000 },
  'sungai raya': { island: 'Kalimantan', lat: -0.0833, lng: 109.3667 },
  'mempawah': { island: 'Kalimantan', lat: 0.2500, lng: 108.9667 },
  'singkawang': { island: 'Kalimantan', lat: 0.9067, lng: 108.9868 },
  'sambas': { island: 'Kalimantan', lat: 1.3500, lng: 109.3000 },
  'bengkayang': { island: 'Kalimantan', lat: 0.8167, lng: 109.6500 },
  'landak': { island: 'Kalimantan', lat: 0.4000, lng: 109.7500 },
  'ngabang': { island: 'Kalimantan', lat: 0.3833, lng: 109.9500 },
  'sanggau': { island: 'Kalimantan', lat: 0.1167, lng: 110.5833 },
  'sekadau': { island: 'Kalimantan', lat: 0.0333, lng: 110.9500 },
  'sintang': { island: 'Kalimantan', lat: 0.0667, lng: 111.4833 },
  'melawi': { island: 'Kalimantan', lat: -0.3333, lng: 111.7000 },
  'nanga pinoh': { island: 'Kalimantan', lat: -0.3392, lng: 111.7456 },
  'kapuas hulu': { island: 'Kalimantan', lat: 0.8000, lng: 112.8000 },
  'putussibau': { island: 'Kalimantan', lat: 0.8667, lng: 112.9333 },
  'ketapang': { island: 'Kalimantan', lat: -1.8333, lng: 109.9833 },
  'kayong utara': { island: 'Kalimantan', lat: -1.1500, lng: 109.9500 },
  'palangkaraya': { island: 'Kalimantan', lat: -2.2161, lng: 113.9139 },
  'palangka raya': { island: 'Kalimantan', lat: -2.2161, lng: 113.9139 },
  'kapuas': { island: 'Kalimantan', lat: -2.5000, lng: 114.4000 },
  'kuala kapuas': { island: 'Kalimantan', lat: -3.0092, lng: 114.3853 },
  'barito selatan': { island: 'Kalimantan', lat: -1.8000, lng: 114.8500 },
  'buntok': { island: 'Kalimantan', lat: -1.7208, lng: 114.8467 },
  'barito utara': { island: 'Kalimantan', lat: -0.9000, lng: 115.1500 },
  'muara teweh': { island: 'Kalimantan', lat: -0.9500, lng: 114.8833 },
  'kotawaringin timur': { island: 'Kalimantan', lat: -2.0833, lng: 112.7500 },
  'sampit': { island: 'Kalimantan', lat: -2.5333, lng: 112.9500 },
  'kotawaringin barat': { island: 'Kalimantan', lat: -2.4000, lng: 111.7500 },
  'pangkalan bun': { island: 'Kalimantan', lat: -2.6833, lng: 111.6167 },
  'katingan': { island: 'Kalimantan', lat: -1.9000, lng: 113.4000 },
  'kasongan': { island: 'Kalimantan', lat: -1.9167, lng: 113.3833 },
  'seruyan': { island: 'Kalimantan', lat: -2.4000, lng: 112.2500 },
  'kuala pembuang': { island: 'Kalimantan', lat: -3.3000, lng: 112.5500 },
  'sukamara': { island: 'Kalimantan', lat: -2.6333, lng: 111.2333 },
  'lamandau': { island: 'Kalimantan', lat: -1.8500, lng: 111.3000 },
  'nanga bulik': { island: 'Kalimantan', lat: -2.1667, lng: 111.4500 },
  'gunung mas': { island: 'Kalimantan', lat: -1.0000, lng: 113.5000 },
  'kuala kurun': { island: 'Kalimantan', lat: -1.1333, lng: 113.8667 },
  'pulang pisau': { island: 'Kalimantan', lat: -2.7500, lng: 114.1500 },
  'murung raya': { island: 'Kalimantan', lat: -0.0500, lng: 114.3000 },
  'puruk cahu': { island: 'Kalimantan', lat: -0.6333, lng: 114.5833 },
  'barito timur': { island: 'Kalimantan', lat: -1.9500, lng: 115.1000 },
  'tamiang layang': { island: 'Kalimantan', lat: -2.1333, lng: 115.1667 },
  'banjarmasin': { island: 'Kalimantan', lat: -3.3194, lng: 114.5908 },
  'banjarbaru': { island: 'Kalimantan', lat: -3.4403, lng: 114.8302 },
  'kabupaten banjar': { island: 'Kalimantan', lat: -3.3167, lng: 115.0833 },
  'banjar kalsel': { island: 'Kalimantan', lat: -3.3167, lng: 115.0833 },
  'martapura': { island: 'Kalimantan', lat: -3.4167, lng: 114.8500 },
  'tanah laut': { island: 'Kalimantan', lat: -3.8500, lng: 114.8500 },
  'pelaihari': { island: 'Kalimantan', lat: -3.8000, lng: 114.7667 },
  'barito kuala': { island: 'Kalimantan', lat: -3.0000, lng: 114.6000 },
  'marabahan': { island: 'Kalimantan', lat: -2.9833, lng: 114.7667 },
  'tapin': { island: 'Kalimantan', lat: -2.9167, lng: 115.1667 },
  'rantau': { island: 'Kalimantan', lat: -2.9333, lng: 115.1500 },
  'hulu sungai selatan': { island: 'Kalimantan', lat: -2.7500, lng: 115.2500 },
  'kandangan': { island: 'Kalimantan', lat: -2.7833, lng: 115.2500 },
  'hulu sungai tengah': { island: 'Kalimantan', lat: -2.6000, lng: 115.4000 },
  'barabai': { island: 'Kalimantan', lat: -2.5833, lng: 115.3833 },
  'hulu sungai utara': { island: 'Kalimantan', lat: -2.4500, lng: 115.2500 },
  'amuntai': { island: 'Kalimantan', lat: -2.4167, lng: 115.2500 },
  'tabalong': { island: 'Kalimantan', lat: -1.9000, lng: 115.5000 },
  'tanjung': { island: 'Kalimantan', lat: -2.1833, lng: 115.3833 },
  'tanah bumbu': { island: 'Kalimantan', lat: -3.4500, lng: 115.7000 },
  'batulicin': { island: 'Kalimantan', lat: -3.4500, lng: 116.0000 },
  'kotabaru': { island: 'Kalimantan', lat: -3.2500, lng: 116.2167 },
  'balangan': { island: 'Kalimantan', lat: -2.3500, lng: 115.6000 },
  'paringin': { island: 'Kalimantan', lat: -2.3333, lng: 115.4667 },
  'samarinda': { island: 'Kalimantan', lat: -0.5022, lng: 117.1536 },
  'balikpapan': { island: 'Kalimantan', lat: -1.2654, lng: 116.8312 },
  'bontang': { island: 'Kalimantan', lat: 0.1333, lng: 117.5000 },
  'kutai kartanegara': { island: 'Kalimantan', lat: -0.4500, lng: 116.9833 },
  'kukar': { island: 'Kalimantan', lat: -0.4500, lng: 116.9833 },
  'tenggarong': { island: 'Kalimantan', lat: -0.4167, lng: 116.9833 },
  'kutai barat': { island: 'Kalimantan', lat: -0.6000, lng: 115.7000 },
  'sendawar': { island: 'Kalimantan', lat: -0.2333, lng: 115.7000 },
  'kutai timur': { island: 'Kalimantan', lat: 0.8500, lng: 117.5000 },
  'kutim': { island: 'Kalimantan', lat: 0.8500, lng: 117.5000 },
  'sangatta': { island: 'Kalimantan', lat: 0.4833, lng: 117.5500 },
  'berau': { island: 'Kalimantan', lat: 2.1500, lng: 117.4000 },
  'tanjung redeb': { island: 'Kalimantan', lat: 2.1667, lng: 117.5000 },
  'penajam paser utara': { island: 'Kalimantan', lat: -1.3000, lng: 116.7000 },
  'ppu': { island: 'Kalimantan', lat: -1.3000, lng: 116.7000 },
  'penajam': { island: 'Kalimantan', lat: -1.2833, lng: 116.7833 },
  'paser': { island: 'Kalimantan', lat: -1.8500, lng: 116.0000 },
  'tanah grogot': { island: 'Kalimantan', lat: -1.8833, lng: 116.1667 },
  'mahakam ulu': { island: 'Kalimantan', lat: 0.5000, lng: 115.0000 },
  'mahulu': { island: 'Kalimantan', lat: 0.5000, lng: 115.0000 },
  'ujoh bilang': { island: 'Kalimantan', lat: 0.6167, lng: 115.3167 },
  'nusantara': { island: 'Kalimantan', lat: -0.9739, lng: 116.7089 },
  'ikn': { island: 'Kalimantan', lat: -0.9739, lng: 116.7089 },
  'tarakan': { island: 'Kalimantan', lat: 3.3272, lng: 117.5785 },
  'bulungan': { island: 'Kalimantan', lat: 2.9000, lng: 117.1000 },
  'tanjung selor': { island: 'Kalimantan', lat: 2.8333, lng: 117.3667 },
  'malinau': { island: 'Kalimantan', lat: 3.5833, lng: 116.6333 },
  'nunukan': { island: 'Kalimantan', lat: 4.1333, lng: 117.6500 },
  'tana tidung': { island: 'Kalimantan', lat: 3.5500, lng: 117.2500 },
  'tideng pale': { island: 'Kalimantan', lat: 3.5667, lng: 117.0333 },

  // Sulawesi
  'makassar': { island: 'Sulawesi', lat: -5.1477, lng: 119.4327 },
  'gowa': { island: 'Sulawesi', lat: -5.3000, lng: 119.7500 },
  'sungguminasa': { island: 'Sulawesi', lat: -5.2000, lng: 119.4500 },
  'maros': { island: 'Sulawesi', lat: -5.0044, lng: 119.5744 },
  'turikale': { island: 'Sulawesi', lat: -5.0000, lng: 119.5667 },
  'pangkajene': { island: 'Sulawesi', lat: -4.8333, lng: 119.5500 },
  'pangkep': { island: 'Sulawesi', lat: -4.8333, lng: 119.5500 },
  'barru': { island: 'Sulawesi', lat: -4.4167, lng: 119.6167 },
  'bone': { island: 'Sulawesi', lat: -4.5333, lng: 120.3167 },
  'watampone': { island: 'Sulawesi', lat: -4.5417, lng: 120.3278 },
  'soppeng': { island: 'Sulawesi', lat: -4.3500, lng: 119.8833 },
  'watansoppeng': { island: 'Sulawesi', lat: -4.3489, lng: 119.8911 },
  'wajo': { island: 'Sulawesi', lat: -4.0000, lng: 120.1500 },
  'sengkang': { island: 'Sulawesi', lat: -4.1306, lng: 120.0306 },
  'sidrap': { island: 'Sulawesi', lat: -3.8833, lng: 119.9667 },
  'sidenreng rappang': { island: 'Sulawesi', lat: -3.8833, lng: 119.9667 },
  'pinrang': { island: 'Sulawesi', lat: -3.7833, lng: 119.6500 },
  'enrekang': { island: 'Sulawesi', lat: -3.5500, lng: 119.7833 },
  'luwu': { island: 'Sulawesi', lat: -3.1500, lng: 120.2500 },
  'belopa': { island: 'Sulawesi', lat: -3.3500, lng: 120.3667 },
  'palopo': { island: 'Sulawesi', lat: -2.9944, lng: 120.1969 },
  'luwu utara': { island: 'Sulawesi', lat: -2.6000, lng: 120.3000 },
  'masamba': { island: 'Sulawesi', lat: -2.5500, lng: 120.3167 },
  'luwu timur': { island: 'Sulawesi', lat: -2.6000, lng: 121.2500 },
  'malili': { island: 'Sulawesi', lat: -2.5667, lng: 121.1000 },
  'tana toraja': { island: 'Sulawesi', lat: -3.1000, lng: 119.8500 },
  'makale': { island: 'Sulawesi', lat: -3.1000, lng: 119.8667 },
  'toraja utara': { island: 'Sulawesi', lat: -2.9500, lng: 119.9000 },
  'rantepao': { island: 'Sulawesi', lat: -2.9667, lng: 119.9000 },
  'sinjai': { island: 'Sulawesi', lat: -5.1333, lng: 120.2500 },
  'bulukumba': { island: 'Sulawesi', lat: -5.5500, lng: 120.2000 },
  'bantaeng': { island: 'Sulawesi', lat: -5.5500, lng: 119.9500 },
  'jeneponto': { island: 'Sulawesi', lat: -5.6500, lng: 119.6500 },
  'bontosunggu': { island: 'Sulawesi', lat: -5.6989, lng: 119.7428 },
  'takalar': { island: 'Sulawesi', lat: -5.4167, lng: 119.5833 },
  'pattallassang': { island: 'Sulawesi', lat: -5.4167, lng: 119.5500 },
  'selayar': { island: 'Sulawesi', lat: -6.1167, lng: 120.4833 },
  'benteng': { island: 'Sulawesi', lat: -6.1208, lng: 120.4597 },
  'parepare': { island: 'Sulawesi', lat: -4.0139, lng: 119.6267 },
  'pare pare': { island: 'Sulawesi', lat: -4.0139, lng: 119.6267 },
  'manado': { island: 'Sulawesi', lat: 1.4748, lng: 124.8421 },
  'bitung': { island: 'Sulawesi', lat: 1.4404, lng: 125.1217 },
  'tomohon': { island: 'Sulawesi', lat: 1.3256, lng: 124.8394 },
  'kotamobagu': { island: 'Sulawesi', lat: 0.7300, lng: 124.3167 },
  'minahasa': { island: 'Sulawesi', lat: 1.2500, lng: 124.8500 },
  'tondano': { island: 'Sulawesi', lat: 1.3000, lng: 124.9167 },
  'minahasa utara': { island: 'Sulawesi', lat: 1.4000, lng: 124.9833 },
  'minut': { island: 'Sulawesi', lat: 1.4000, lng: 124.9833 },
  'airmadidi': { island: 'Sulawesi', lat: 1.4167, lng: 124.9833 },
  'minahasa selatan': { island: 'Sulawesi', lat: 1.0500, lng: 124.6000 },
  'minsel': { island: 'Sulawesi', lat: 1.0500, lng: 124.6000 },
  'amurang': { island: 'Sulawesi', lat: 1.1833, lng: 124.5667 },
  'minahasa tenggara': { island: 'Sulawesi', lat: 1.0000, lng: 124.8000 },
  'mitra': { island: 'Sulawesi', lat: 1.0000, lng: 124.8000 },
  'ratahan': { island: 'Sulawesi', lat: 1.0333, lng: 124.8000 },
  'bolmong': { island: 'Sulawesi', lat: 0.7500, lng: 124.0000 },
  'bolaang mongondow': { island: 'Sulawesi', lat: 0.7500, lng: 124.0000 },
  'lolak': { island: 'Sulawesi', lat: 0.8833, lng: 124.0000 },
  'sangihe': { island: 'Sulawesi', lat: 3.5000, lng: 125.5500 },
  'tahuna': { island: 'Sulawesi', lat: 3.6167, lng: 125.4833 },
  'talaud': { island: 'Sulawesi', lat: 4.3000, lng: 126.8000 },
  'melonguane': { island: 'Sulawesi', lat: 4.0000, lng: 126.6833 },
  'sitaro': { island: 'Sulawesi', lat: 2.7500, lng: 125.4000 },
  'palu': { island: 'Sulawesi', lat: -0.9003, lng: 119.8779 },
  'donggala': { island: 'Sulawesi', lat: -0.6833, lng: 119.7500 },
  'banawa': { island: 'Sulawesi', lat: -0.6833, lng: 119.7500 },
  'sigi': { island: 'Sulawesi', lat: -1.3500, lng: 119.9500 },
  'sigi biromaru': { island: 'Sulawesi', lat: -0.9833, lng: 119.9167 },
  'parigi moutong': { island: 'Sulawesi', lat: 0.5000, lng: 120.2500 },
  'parimo': { island: 'Sulawesi', lat: 0.5000, lng: 120.2500 },
  'parigi': { island: 'Sulawesi', lat: -0.8167, lng: 120.1833 },
  'poso': { island: 'Sulawesi', lat: -1.4000, lng: 120.7500 },
  'tojo una una': { island: 'Sulawesi', lat: -1.1000, lng: 121.5000 },
  'ampana': { island: 'Sulawesi', lat: -0.8667, lng: 121.5833 },
  'tolitoli': { island: 'Sulawesi', lat: 1.0500, lng: 120.8000 },
  'toli toli': { island: 'Sulawesi', lat: 1.0500, lng: 120.8000 },
  'buol': { island: 'Sulawesi', lat: 1.1500, lng: 121.4000 },
  'banggai': { island: 'Sulawesi', lat: -1.3500, lng: 122.8000 },
  'luwuk': { island: 'Sulawesi', lat: -0.9500, lng: 122.7833 },
  'banggai kepulauan': { island: 'Sulawesi', lat: -1.4000, lng: 123.3000 },
  'salakan': { island: 'Sulawesi', lat: -1.3000, lng: 123.3500 },
  'morowali': { island: 'Sulawesi', lat: -2.3000, lng: 121.8000 },
  'bungku': { island: 'Sulawesi', lat: -2.5333, lng: 121.9667 },
  'morowali utara': { island: 'Sulawesi', lat: -1.8500, lng: 121.3000 },
  'morut': { island: 'Sulawesi', lat: -1.8500, lng: 121.3000 },
  'kolonodale': { island: 'Sulawesi', lat: -1.9833, lng: 121.3333 },
  'kendari': { island: 'Sulawesi', lat: -3.9985, lng: 122.5126 },
  'bau bau': { island: 'Sulawesi', lat: -5.4667, lng: 122.6000 },
  'baubau': { island: 'Sulawesi', lat: -5.4667, lng: 122.6000 },
  'konawe': { island: 'Sulawesi', lat: -3.8500, lng: 122.0500 },
  'unaaha': { island: 'Sulawesi', lat: -3.8667, lng: 122.0500 },
  'konawe selatan': { island: 'Sulawesi', lat: -4.3000, lng: 122.2500 },
  'konsel': { island: 'Sulawesi', lat: -4.3000, lng: 122.2500 },
  'andoolo': { island: 'Sulawesi', lat: -4.3167, lng: 122.2500 },
  'konawe utara': { island: 'Sulawesi', lat: -3.3500, lng: 122.1000 },
  'konut': { island: 'Sulawesi', lat: -3.3500, lng: 122.1000 },
  'wanggudu': { island: 'Sulawesi', lat: -3.5167, lng: 122.1833 },
  'kolaka': { island: 'Sulawesi', lat: -4.0500, lng: 121.6000 },
  'kolaka utara': { island: 'Sulawesi', lat: -3.2000, lng: 121.0500 },
  'lasusua': { island: 'Sulawesi', lat: -3.1833, lng: 120.8833 },
  'kolaka timur': { island: 'Sulawesi', lat: -4.1000, lng: 121.8000 },
  'koltim': { island: 'Sulawesi', lat: -4.1000, lng: 121.8000 },
  'tirawuta': { island: 'Sulawesi', lat: -4.1333, lng: 121.8667 },
  'muna': { island: 'Sulawesi', lat: -4.8500, lng: 122.7000 },
  'raha': { island: 'Sulawesi', lat: -4.8500, lng: 122.7167 },
  'muna barat': { island: 'Sulawesi', lat: -4.8000, lng: 122.4500 },
  'sawerigadi': { island: 'Sulawesi', lat: -4.8333, lng: 122.4833 },
  'buton': { island: 'Sulawesi', lat: -5.2000, lng: 122.8500 },
  'pasarwajo': { island: 'Sulawesi', lat: -5.5167, lng: 122.8500 },
  'buton selatan': { island: 'Sulawesi', lat: -5.6000, lng: 122.7000 },
  'busel': { island: 'Sulawesi', lat: -5.6000, lng: 122.7000 },
  'batauga': { island: 'Sulawesi', lat: -5.5833, lng: 122.6500 },
  'buton tengah': { island: 'Sulawesi', lat: -5.3000, lng: 122.4000 },
  'buteng': { island: 'Sulawesi', lat: -5.3000, lng: 122.4000 },
  'labungkari': { island: 'Sulawesi', lat: -5.3167, lng: 122.4500 },
  'buton utara': { island: 'Sulawesi', lat: -4.8000, lng: 122.9500 },
  'butur': { island: 'Sulawesi', lat: -4.8000, lng: 122.9500 },
  'buranga': { island: 'Sulawesi', lat: -4.8333, lng: 122.9333 },
  'wakatobi': { island: 'Sulawesi', lat: -5.3167, lng: 123.5833 },
  'wangi wangi': { island: 'Sulawesi', lat: -5.3333, lng: 123.5500 },
  'gorontalo': { island: 'Sulawesi', lat: 0.5435, lng: 123.0568 },
  'limboto': { island: 'Sulawesi', lat: 0.6256, lng: 122.9817 },
  'gorontalo utara': { island: 'Sulawesi', lat: 0.8500, lng: 122.8000 },
  'kwandang': { island: 'Sulawesi', lat: 0.8333, lng: 122.9167 },
  'bone bolango': { island: 'Sulawesi', lat: 0.5500, lng: 123.2000 },
  'suwawa': { island: 'Sulawesi', lat: 0.5500, lng: 123.1500 },
  'boalemo': { island: 'Sulawesi', lat: 0.6500, lng: 122.3500 },
  'tilamuta': { island: 'Sulawesi', lat: 0.5333, lng: 122.3000 },
  'pohuwato': { island: 'Sulawesi', lat: 0.5500, lng: 121.8000 },
  'marisa': { island: 'Sulawesi', lat: 0.4667, lng: 121.9333 },
  'mamuju': { island: 'Sulawesi', lat: -2.6770, lng: 118.8890 },
  'mamuju tengah': { island: 'Sulawesi', lat: -2.1500, lng: 119.3000 },
  'mateng': { island: 'Sulawesi', lat: -2.1500, lng: 119.3000 },
  'tobadak': { island: 'Sulawesi', lat: -2.1667, lng: 119.3500 },
  'pasangkayu': { island: 'Sulawesi', lat: -1.3500, lng: 119.3500 },
  'polewali mandar': { island: 'Sulawesi', lat: -3.4000, lng: 119.2500 },
  'polman': { island: 'Sulawesi', lat: -3.4000, lng: 119.2500 },
  'polewali': { island: 'Sulawesi', lat: -3.4333, lng: 119.3333 },
  'majene': { island: 'Sulawesi', lat: -3.0000, lng: 118.9000 },
  'mamasa': { island: 'Sulawesi', lat: -2.9500, lng: 119.3500 },

  // Bali, NTB, NTT, Flores
  'denpasar': { island: 'Bali', lat: -8.6705, lng: 115.2126 },
  'badung': { island: 'Bali', lat: -8.5833, lng: 115.1833 },
  'mangupura': { island: 'Bali', lat: -8.5833, lng: 115.1833 },
  'kuta': { island: 'Bali', lat: -8.7233, lng: 115.1725 },
  'gianyar': { island: 'Bali', lat: -8.5333, lng: 115.3333 },
  'ubud': { island: 'Bali', lat: -8.5069, lng: 115.2625 },
  'buleleng': { island: 'Bali', lat: -8.2167, lng: 115.0000 },
  'singaraja': { island: 'Bali', lat: -8.1120, lng: 115.0882 },
  'tabanan': { island: 'Bali', lat: -8.5392, lng: 115.1238 },
  'klungkung': { island: 'Bali', lat: -8.5333, lng: 115.4000 },
  'semarapura': { island: 'Bali', lat: -8.5375, lng: 115.4042 },
  'bangli': { island: 'Bali', lat: -8.4500, lng: 115.3500 },
  'karangasem': { island: 'Bali', lat: -8.4000, lng: 115.5500 },
  'amlapura': { island: 'Bali', lat: -8.4500, lng: 115.6167 },
  'jembrana': { island: 'Bali', lat: -8.3000, lng: 114.6500 },
  'negara': { island: 'Bali', lat: -8.3667, lng: 114.6167 },
  'mataram': { island: 'NTB', lat: -8.5833, lng: 116.1167 },
  'lombok barat': { island: 'NTB', lat: -8.6833, lng: 116.1333 },
  'gerung': { island: 'NTB', lat: -8.6833, lng: 116.1167 },
  'lombok tengah': { island: 'NTB', lat: -8.7000, lng: 116.2833 },
  'praya': { island: 'NTB', lat: -8.7000, lng: 116.2667 },
  'lombok timur': { island: 'NTB', lat: -8.5500, lng: 116.5333 },
  'selong': { island: 'NTB', lat: -8.6500, lng: 116.5333 },
  'lombok utara': { island: 'NTB', lat: -8.3500, lng: 116.2500 },
  'tanjung lombok utara': { island: 'NTB', lat: -8.3500, lng: 116.1500 },
  'tanjung ntb': { island: 'NTB', lat: -8.3500, lng: 116.1500 },
  'sumbawa': { island: 'NTB', lat: -8.5000, lng: 117.4167 },
  'sumbawa besar': { island: 'NTB', lat: -8.5000, lng: 117.4333 },
  'sumbawa barat': { island: 'NTB', lat: -8.7500, lng: 116.9000 },
  'taliwang': { island: 'NTB', lat: -8.7500, lng: 116.8500 },
  'dompu': { island: 'NTB', lat: -8.5333, lng: 118.4500 },
  'bima': { island: 'NTB', lat: -8.4608, lng: 118.7256 },
  'raba': { island: 'NTB', lat: -8.4667, lng: 118.7500 },
  'kupang': { island: 'NTT', lat: -10.1772, lng: 123.6070 },
  'timor tengah selatan': { island: 'NTT', lat: -9.8606, lng: 124.2798 },
  'tts': { island: 'NTT', lat: -9.8606, lng: 124.2798 },
  'soe': { island: 'NTT', lat: -9.8606, lng: 124.2798 },
  'timor tengah utara': { island: 'NTT', lat: -9.4500, lng: 124.5500 },
  'ttu': { island: 'NTT', lat: -9.4500, lng: 124.5500 },
  'kefamenanu': { island: 'NTT', lat: -9.4500, lng: 124.4833 },
  'belu': { island: 'NTT', lat: -9.1000, lng: 124.9000 },
  'atambua': { island: 'NTT', lat: -9.1067, lng: 124.8933 },
  'malaka': { island: 'NTT', lat: -9.5500, lng: 124.9000 },
  'betun': { island: 'NTT', lat: -9.5667, lng: 124.8833 },
  'rote ndao': { island: 'NTT', lat: -10.7500, lng: 123.1000 },
  'baa': { island: 'NTT', lat: -10.7333, lng: 123.0500 },
  'sabu raijua': { island: 'NTT', lat: -10.5000, lng: 121.8000 },
  'seba': { island: 'NTT', lat: -10.4833, lng: 121.8333 },
  'alor': { island: 'NTT', lat: -8.3000, lng: 124.6000 },
  'kalabahi': { island: 'NTT', lat: -8.3000, lng: 124.5167 },
  'lembata': { island: 'Flores', lat: -8.4000, lng: 123.5500 },
  'lewoleba': { island: 'Flores', lat: -8.3667, lng: 123.4500 },
  'flores timur': { island: 'Flores', lat: -8.3000, lng: 123.0000 },
  'larantuka': { island: 'Flores', lat: -8.3444, lng: 122.9833 },
  'sikka': { island: 'Flores', lat: -8.6833, lng: 122.2500 },
  'maumere': { island: 'Flores', lat: -8.6199, lng: 122.2111 },
  'ende': { island: 'Flores', lat: -8.8454, lng: 121.6563 },
  'flores': { island: 'Flores', lat: -8.6000, lng: 121.0000 },
  'ngada': { island: 'Flores', lat: -8.7500, lng: 120.9667 },
  'bajawa': { island: 'Flores', lat: -8.7917, lng: 120.9667 },
  'nagekeo': { island: 'Flores', lat: -8.6500, lng: 121.2000 },
  'mbay': { island: 'Flores', lat: -8.5667, lng: 121.2833 },
  'manggarai': { island: 'Flores', lat: -8.5500, lng: 120.4500 },
  'ruteng': { island: 'Flores', lat: -8.6167, lng: 120.4667 },
  'manggarai barat': { island: 'Flores', lat: -8.6000, lng: 120.0000 },
  'mabar': { island: 'Flores', lat: -8.6000, lng: 120.0000 },
  'labuan bajo': { island: 'Flores', lat: -8.4539, lng: 119.8823 },
  'manggarai timur': { island: 'Flores', lat: -8.6000, lng: 120.6500 },
  'borong': { island: 'Flores', lat: -8.8000, lng: 120.6167 },
  'sumba timur': { island: 'NTT', lat: -9.8500, lng: 120.2500 },
  'waingapu': { island: 'NTT', lat: -9.6500, lng: 120.2667 },
  'sumba barat': { island: 'NTT', lat: -9.6500, lng: 119.4000 },
  'waikabubak': { island: 'NTT', lat: -9.6333, lng: 119.4167 },
  'sumba barat daya': { island: 'NTT', lat: -9.5500, lng: 119.1500 },
  'tambolaka': { island: 'NTT', lat: -9.4167, lng: 119.2333 },
  'sumba tengah': { island: 'NTT', lat: -9.6000, lng: 119.6500 },
  'waibakul': { island: 'NTT', lat: -9.6333, lng: 119.6500 },

  // Maluku & Papua
  'ambon': { island: 'Papua', lat: -3.6954, lng: 128.1814 },
  'tual': { island: 'Papua', lat: -5.6333, lng: 132.7500 },
  'maluku tengah': { island: 'Papua', lat: -3.3000, lng: 128.9500 },
  'masohi': { island: 'Papua', lat: -3.3000, lng: 128.9500 },
  'maluku tenggara': { island: 'Papua', lat: -5.7500, lng: 132.7500 },
  'langgur': { island: 'Papua', lat: -5.6333, lng: 132.7333 },
  'tanimbar': { island: 'Papua', lat: -7.8500, lng: 131.3000 },
  'saumlaki': { island: 'Papua', lat: -7.9833, lng: 131.3000 },
  'buru': { island: 'Papua', lat: -3.3500, lng: 126.7000 },
  'namlea': { island: 'Papua', lat: -3.2500, lng: 127.1000 },
  'ternate': { island: 'Papua', lat: 0.7906, lng: 127.3826 },
  'tidore': { island: 'Papua', lat: 0.6833, lng: 127.4000 },
  'jayapura': { island: 'Papua', lat: -2.5337, lng: 140.7181 },
  'sentani': { island: 'Papua', lat: -2.5667, lng: 140.5167 },
  'keerom': { island: 'Papua', lat: -3.3000, lng: 140.6000 },
  'waris': { island: 'Papua', lat: -3.2000, lng: 140.8500 },
  'biak': { island: 'Papua', lat: -1.1756, lng: 136.0825 },
  'biak numfor': { island: 'Papua', lat: -1.0000, lng: 136.0000 },
  'serui': { island: 'Papua', lat: -1.8833, lng: 136.2333 },
  'nabire': { island: 'Papua', lat: -3.3667, lng: 135.4833 },
  'mimika': { island: 'Papua', lat: -4.5448, lng: 136.8872 },
  'timika': { island: 'Papua', lat: -4.5467, lng: 136.8837 },
  'paniai': { island: 'Papua', lat: -3.9000, lng: 136.3500 },
  'jayawijaya': { island: 'Papua', lat: -4.0833, lng: 138.9500 },
  'wamena': { island: 'Papua', lat: -4.0833, lng: 138.9500 },
  'merauke': { island: 'Papua', lat: -8.4991, lng: 140.4020 },
  'boven digoel': { island: 'Papua', lat: -5.7500, lng: 140.3500 },
  'tanah merah': { island: 'Papua', lat: -6.1000, lng: 140.3000 },
  'asmat': { island: 'Papua', lat: -5.4000, lng: 138.2500 },
  'agats': { island: 'Papua', lat: -5.5333, lng: 138.1333 },
  'sorong': { island: 'Papua', lat: -0.8762, lng: 131.2558 },
  'aimas': { island: 'Papua', lat: -0.9500, lng: 131.3333 },
  'raja ampat': { island: 'Papua', lat: -0.2333, lng: 130.5167 },
  'waisai': { island: 'Papua', lat: -0.4333, lng: 130.8167 },
  'manokwari': { island: 'Papua', lat: -0.8615, lng: 134.0620 },
  'fakfak': { island: 'Papua', lat: -2.9333, lng: 132.3000 },
  'kaimana': { island: 'Papua', lat: -3.6667, lng: 133.7667 }
};

// Advanced Fuzzy & Similarity Matching helper between raw nmkc_keluhan (group) and Indonesian cities / regencies
function resolveLocationFromKCName(rawName: string): { island: string; lat: number; lng: number; matchedCity: string } {
  if (!rawName) {
    return { island: 'Jawa', lat: -6.2088, lng: 106.8456, matchedCity: 'Jakarta' };
  }

  // 1. Clean the raw string: Remove parenthetical groups like (group), (01), etc.
  let cleaned = rawName.toLowerCase();
  cleaned = cleaned.replace(/\(.*?\)/g, ' '); // remove (group), (cabang), etc.
  cleaned = cleaned.replace(/\[.*?\]/g, ' ');
  
  // 2. Strip common BPJS / KC prefixes and administrative noise words
  cleaned = cleaned
    .replace(/\b(nmkc_keluhan|nmkc|kc_keluhan|kckeluhan|kantor\s+cabang\s+keluhan|kantor\s+cabang|kacab|cabang|kcu|kcp|unit|wilayah|daerah|group|grub|dati\s+ii|dati\s+i|provinsi|prov|kota\s+adm\.|kabupaten|kab\.|kab|kotamadya|kodya|kota)\b/gi, ' ')
    .replace(/[0-9_\-\.\,\/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 3. Exact dictionary match on cleaned name
  if (INDONESIA_KAB_KOTA_GEOCODING[cleaned]) {
    const res = INDONESIA_KAB_KOTA_GEOCODING[cleaned];
    return { ...res, matchedCity: cleaned };
  }

  // 4. Multi-word phrase & substring matching against known Indonesian cities/regencies (prioritize longest matching city name)
  const sortedKeys = Object.keys(INDONESIA_KAB_KOTA_GEOCODING).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    // Check if the key is inside the cleaned string or raw string as a distinct word/phrase
    const keyRegex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (keyRegex.test(cleaned) || keyRegex.test(rawName.toLowerCase())) {
      const res = INDONESIA_KAB_KOTA_GEOCODING[key];
      return { ...res, matchedCity: key };
    }
  }

  // 5. Fallback Substring search (contains check)
  for (const key of sortedKeys) {
    if (cleaned.includes(key) || (key.length > 4 && key.includes(cleaned))) {
      const res = INDONESIA_KAB_KOTA_GEOCODING[key];
      return { ...res, matchedCity: key };
    }
  }

  // 6. Bigram / Dice Similarity Matching for typos or slight naming differences
  let bestMatchKey = '';
  let highestScore = 0;

  const getBigrams = (str: string) => {
    const s = str.replace(/\s+/g, '');
    const v = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) {
      v.add(s.slice(i, i + 2));
    }
    return v;
  };

  const cleanBigrams = getBigrams(cleaned);
  if (cleanBigrams.size > 0) {
    for (const key of sortedKeys) {
      const keyBigrams = getBigrams(key);
      let intersection = 0;
      cleanBigrams.forEach(bg => {
        if (keyBigrams.has(bg)) intersection++;
      });
      const score = (2.0 * intersection) / (cleanBigrams.size + keyBigrams.size);
      if (score > highestScore) {
        highestScore = score;
        bestMatchKey = key;
      }
    }
  }

  if (highestScore >= 0.40 && bestMatchKey) {
    const res = INDONESIA_KAB_KOTA_GEOCODING[bestMatchKey];
    return { ...res, matchedCity: bestMatchKey };
  }

  // 7. Deterministic Island & Coordinate Fallback if not identified
  const hash = Array.from(rawName).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const fallbackLat = -6.2 + ((hash % 10) * 0.15) - 0.75;
  const fallbackLng = 106.8 + ((hash % 15) * 0.25);

  return {
    island: 'Jawa',
    lat: fallbackLat,
    lng: fallbackLng,
    matchedCity: rawName
  };
}

// Preset views for quick zoom to major island groups
const ISLAND_PRESETS: Record<string, { center: [number, number]; zoom: number }> = {
  'Semua': { center: [-2.5, 118.0], zoom: 5 },
  'Sumatra': { center: [0.5, 101.5], zoom: 6 },
  'Jawa': { center: [-7.3, 110.2], zoom: 7 },
  'Kalimantan': { center: [-0.5, 114.0], zoom: 6 },
  'Sulawesi': { center: [-1.8, 121.0], zoom: 6 },
  'Bali': { center: [-8.4, 115.2], zoom: 9 },
  'NTB': { center: [-8.6, 117.5], zoom: 8 },
  'NTT': { center: [-9.8, 122.5], zoom: 7 },
  'Flores': { center: [-8.6, 121.0], zoom: 8 },
  'Papua': { center: [-3.5, 137.5], zoom: 6 }
};

// Strict Terrain / Relief OpenTopoMap Layer with Topography Contours and Shaded Elevation
const TERRAIN_LAYER_CONFIG = {
  url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
};

export const IndonesiaMapCard: React.FC<IndonesiaMapCardProps> = ({
  rows,
  columns,
  selectedRegionFilter = [],
  onSelectRegionFilter,
  onResetRegionFilter,
  onClose,
}) => {
  const [apiKey, setApiKey] = useState<string>('YOUR_GOOGLE_MAPS_API_KEY');
  const [isKeyInputOpen, setIsKeyInputOpen] = useState<boolean>(false);
  const [tempKey, setTempKey] = useState<string>('YOUR_GOOGLE_MAPS_API_KEY');
  
  // Default data is empty when no dataset is uploaded, purely showing the terrain/relief base map
  const [regions, setRegions] = useState<RegionDetail[]>([]);
  const [selectedIsland, setSelectedIsland] = useState<string>('Semua');
  const [rankingFilter, setRankingFilter] = useState<'all' | 'top10' | 'bottom10'>('all');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showChoroplethHeat, setShowChoroplethHeat] = useState<boolean>(true);

  // Calculation Formula State: COUNT (Frekuensi record nmkc_keluhan)
  const calcFormula = 'COUNT' as const;
  const [totalTableUtilization, setTotalTableUtilization] = useState<number>(0);
  const [totalTableRowsCount, setTotalTableRowsCount] = useState<number>(0);
  const [activeRegionColLabel, setActiveRegionColLabel] = useState<string>('nmkc_keluhan (group)');

  // Modal State for CRUD
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRegion, setEditingRegion] = useState<RegionDetail | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    island: 'Jawa',
    utilizationCount: 500,
    status: 'Sedang' as 'Tinggi' | 'Sedang' | 'Rendah',
    description: '',
    lat: -6.2088,
    lng: 106.8456
  });

  // Leaflet Map instance ref
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const heatLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Candidate numeric columns available for SUM calculation
  const numericCandidateCols = useMemo(() => {
    if (!columns || columns.length === 0) return [];
    return columns.filter(c => {
      // Exclude ID, year, zip code, phone, code columns from default numeric metrics
      if (/^(id|_id|no|nomor|kode|kd_|kd|tahun|year|bulan|month|pos|kodepos|nik|nip|telepon|telp|hp)$/i.test(c.key)) {
        return false;
      }
      return c.type === 'number' || /pemanfaatan|layanan|jumlah|total|count|transaksi|volume|bobot|value|score|qty|nilai|biaya|tarif|nominal/i.test(c.key) || /pemanfaatan|layanan|jumlah|total|count|transaksi|volume|bobot|value|score|qty|nilai|biaya|tarif|nominal/i.test(c.label);
    });
  }, [columns]);

  // Synchronize with uploaded or active Sheet Data strictly prioritized by nmkc_keluhan (group)
  useEffect(() => {
    if (!rows || rows.length === 0 || !columns || columns.length === 0) {
      setRegions([]);
      setSelectedRegionId('');
      setTotalTableUtilization(0);
      setTotalTableRowsCount(0);
      return;
    }

    // 1. Locate the nmkc_keluhan (group) / Kantor Cabang / Wilayah column dynamically with strict top priority for nmkc_keluhan (group)
    const regionColDef = columns.find(c => 
      /nmkc.*keluhan.*group|nmkc_keluhan\s*\(\s*group\s*\)|nmkc_keluhan|nmkckeluhan|nm_kc_keluhan|kckeluhan|kc_keluhan/i.test(c.key) ||
      /nmkc.*keluhan.*group|nmkc_keluhan\s*\(\s*group\s*\)|nmkc_keluhan|nmkckeluhan|nm_kc_keluhan|kckeluhan|kc_keluhan/i.test(c.label)
    ) || columns.find(c => 
      /nmkc|kantor.*cabang.*keluhan|kantor.*cabang|nama.*kantor.*cabang|kacab|cabang.*keluhan/i.test(c.key) ||
      /nmkc|kantor.*cabang.*keluhan|kantor.*cabang|nama.*kantor.*cabang|kacab|cabang.*keluhan/i.test(c.label)
    ) || columns.find(c => 
      /kabupaten|kota|kab|kab\/kota|kab_kota|nama_kabupaten|nama_kota|daerah|wilayah|dati|regency|city|region|lokasi|kabupaten_kota/i.test(c.key) ||
      /kabupaten|kota|kab|kab\/kota|kab_kota|nama_kabupaten|nama_kota|daerah|wilayah|dati|regency|city|region|lokasi|kabupaten_kota/i.test(c.label)
    ) || columns.find(c => c.type === 'string' || !c.type) || columns[0];

    const regionCol = regionColDef?.key;
    setActiveRegionColLabel(regionColDef?.label || 'nmkc_keluhan (group)');

    // 2. Locate description / status columns if available
    const descCol = columns.find(c => 
      /keterangan|deskripsi|catatan|detail|uraian|note|description|status_info/i.test(c.key) ||
      /keterangan|deskripsi|catatan|detail|uraian|note|description|status_info/i.test(c.label)
    )?.key;

    if (!regionCol) {
      setRegions([]);
      setSelectedRegionId('');
      setTotalTableUtilization(0);
      setTotalTableRowsCount(0);
      return;
    }

    // 3. Perform COUNT aggregation matching table frequency
    const aggMap: Record<string, { rawName: string; rowCount: number; sumValue: number; sampleDesc: string }> = {};
    let runningCount = 0;
    
    rows.forEach(row => {
      const rawNameStr = String(row[regionCol] || '').trim();
      const rawName = (rawNameStr && rawNameStr !== '-' && rawNameStr.toLowerCase() !== 'n/a' && rawNameStr.toLowerCase() !== 'null')
        ? rawNameStr
        : 'Lainnya / Belum Terdata';

      const desc = descCol && row[descCol] ? String(row[descCol]) : `Data ${regionColDef?.label || 'nmkc_keluhan (group)'} (${rawName})`;

      if (!aggMap[rawName]) {
        aggMap[rawName] = { rawName, rowCount: 0, sumValue: 0, sampleDesc: desc };
      }
      aggMap[rawName].rowCount += 1;
      aggMap[rawName].sumValue += 1;

      runningCount += 1;
    });

    const entries = Object.entries(aggMap);
    if (entries.length === 0) {
      setRegions([]);
      setSelectedRegionId('');
      setTotalTableUtilization(0);
      setTotalTableRowsCount(0);
      return;
    }

    // Grand total strictly derived from COUNT of rows
    const grandTotal = runningCount;
    setTotalTableUtilization(grandTotal);
    setTotalTableRowsCount(runningCount);

    const counts = entries.map(([_, data]) => data.rowCount);
    const maxVal = Math.max(...counts, 1);
    const minVal = Math.min(...counts, 0);
    const range = maxVal - minVal || 1;

    const syncedRegions: RegionDetail[] = entries.map(([rawName, data], idx) => {
      const calculatedCount = data.rowCount;
      const ratio = (calculatedCount - minVal) / range;
      let status: 'Tinggi' | 'Sedang' | 'Rendah' = 'Sedang';
      if (ratio > 0.6) status = 'Tinggi';
      else if (ratio < 0.3) status = 'Rendah';

      const pct = grandTotal > 0 ? (calculatedCount / grandTotal) * 100 : 0;

      // Resolve geographic coordinates and island by matching nmkc_keluhan (group) against Indonesian Cities & Regencies
      const resolvedGeo = resolveLocationFromKCName(rawName);

      const formulaLabel = `${calculatedCount.toLocaleString('id-ID')} baris data (${pct.toFixed(1)}%)`;

      return {
        id: `sync-${idx}-${rawName}`,
        name: rawName,
        island: resolvedGeo.island,
        utilizationCount: calculatedCount,
        rowCount: data.rowCount,
        sumValue: data.rowCount,
        percentage: pct,
        status,
        description: data.sampleDesc || `Pemanfaatan: ${formulaLabel} di ${resolvedGeo.matchedCity.toUpperCase()}.`,
        lat: resolvedGeo.lat,
        lng: resolvedGeo.lng
      };
    });

    setRegions(syncedRegions);
    if (syncedRegions.length > 0) {
      if (!selectedRegionId || !syncedRegions.some(r => r.id === selectedRegionId)) {
        setSelectedRegionId(syncedRegions[0].id);
      }
      
      // Auto-adjust view to fit newly synchronized data if map is initialized
      if (mapInstanceRef.current && syncedRegions.length > 0) {
        try {
          const latLngs: [number, number][] = syncedRegions.map(r => [r.lat, r.lng]);
          const bounds = L.latLngBounds(latLngs);
          if (bounds.isValid()) {
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 10, duration: 1.0 });
          }
        } catch {
          // ignore
        }
      }
    }
  }, [rows, columns]);

  const islandsList = ['Semua', 'Sumatra', 'Jawa', 'Kalimantan', 'Sulawesi', 'Papua', 'Bali', 'NTB', 'NTT', 'Flores'];

  const filteredRegions = useMemo(() => {
    let list = [...regions];
    if (selectedIsland !== 'Semua') {
      list = list.filter(r => r.island.toLowerCase() === selectedIsland.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.island.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
    }
    
    // Top 10 or Bottom 10 ranking filter
    if (rankingFilter === 'top10') {
      list = list.sort((a, b) => b.utilizationCount - a.utilizationCount).slice(0, 10);
    } else if (rankingFilter === 'bottom10') {
      list = list.sort((a, b) => a.utilizationCount - b.utilizationCount).slice(0, 10);
    }

    return list;
  }, [regions, selectedIsland, searchQuery, rankingFilter]);

  const selectedRegion = regions.find(r => r.id === selectedRegionId) || filteredRegions[0] || regions[0] || null;

  const maxRegion = useMemo(() => {
    if (regions.length === 0) return null;
    return [...regions].sort((a, b) => b.utilizationCount - a.utilizationCount)[0];
  }, [regions]);

  const minRegion = useMemo(() => {
    if (regions.length === 0) return null;
    return [...regions].sort((a, b) => a.utilizationCount - b.utilizationCount)[0];
  }, [regions]);

  const avgUtilization = useMemo(() => {
    if (regions.length === 0) return 0;
    return Math.round(totalTableUtilization / regions.length);
  }, [regions, totalTableUtilization]);

  // Helper colors
  const getStatusColor = (status: 'Tinggi' | 'Sedang' | 'Rendah') => {
    switch (status) {
      case 'Tinggi': return { bg: 'bg-emerald-600 hover:bg-emerald-700', text: 'text-emerald-100', ring: 'ring-emerald-400', hex: '#059669', borderHex: '#047857', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'Sedang': return { bg: 'bg-amber-500 hover:bg-amber-600', text: 'text-amber-100', ring: 'ring-amber-300', hex: '#d97706', borderHex: '#b45309', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'Rendah': return { bg: 'bg-slate-500 hover:bg-slate-600', text: 'text-slate-100', ring: 'ring-slate-300', hex: '#64748b', borderHex: '#475569', badgeBg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  // Initialize and update Leaflet Map strictly in Terrain / Relief Mode
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Map if not created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: ISLAND_PRESETS['Semua'].center,
        zoom: ISLAND_PRESETS['Semua'].zoom,
        zoomControl: false,
        attributionControl: true,
        minZoom: 4,
        maxZoom: 18,
      });

      // Add Terrain / Relief OpenTopoMap Tile Layer strictly
      const tileLayer = L.tileLayer(TERRAIN_LAYER_CONFIG.url, {
        attribution: TERRAIN_LAYER_CONFIG.attribution,
        maxZoom: 18,
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // Layer groups for markers and heat
      const heatGroup = L.layerGroup().addTo(map);
      const markersGroup = L.layerGroup().addTo(map);

      heatLayerGroupRef.current = heatGroup;
      markersLayerGroupRef.current = markersGroup;
      mapInstanceRef.current = map;

      // Invalidate size on load
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers & Choropleth Overlays on Map with Small Round Markers (no numbers) and Hover Spoiler Tooltips
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerGroupRef.current || !heatLayerGroupRef.current) return;

    markersLayerGroupRef.current.clearLayers();
    heatLayerGroupRef.current.clearLayers();

    // If regions list is empty, map remains completely clean and empty showing only the relief landscape
    if (filteredRegions.length === 0) return;

    filteredRegions.forEach(reg => {
      const isSelected = reg.id === selectedRegionId;
      const statusColor = getStatusColor(reg.status);

      // HTML spoiler content for mouse hover
      const formulaSubtitle = calcFormula === 'COUNT' 
        ? `${reg.utilizationCount.toLocaleString('id-ID')} Layanan (Frekuensi Baris)`
        : `${reg.utilizationCount.toLocaleString('id-ID')} Total Nilai (${reg.rowCount} Baris Data)`;

      const spoilerHtml = `
        <div style="
          background: rgba(15, 23, 42, 0.96);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 14px;
          padding: 10px 14px;
          color: #ffffff;
          box-shadow: 0 12px 30px -5px rgba(0, 0, 0, 0.6);
          min-width: 210px;
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
        ">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <strong style="font-weight: 800; font-size: 13px; color: #f8fafc; letter-spacing: -0.01em;">${reg.name}</strong>
            <span style="font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 9999px; background: ${statusColor.hex}; color: #ffffff; text-transform: uppercase;">${reg.status}</span>
          </div>
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.12);">
            <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 6px;">
              <span style="font-size: 10px; color: #94a3b8; font-weight: 600;">Total Pemanfaatan (${calcFormula}):</span>
              <span style="font-size: 14px; font-weight: 900; color: #34d399; font-variant-numeric: tabular-nums;">
                ${reg.utilizationCount.toLocaleString('id-ID')}
              </span>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #a7f3d0; margin-top: 2px;">
              <span>Porsi Nasional:</span>
              <strong style="font-weight: 800;">${reg.percentage.toFixed(1)}% dari total</strong>
            </div>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 10px; color: #cbd5e1;">
            <span>Pulau: <strong style="color: #fbbf24;">${reg.island}</strong></span>
            <span style="font-family: monospace; font-size: 9px; color: #94a3b8;">${reg.lat.toFixed(2)}, ${reg.lng.toFixed(2)}</span>
          </div>
        </div>
      `;

      // 1. Add Choropleth / Heat Bubble Circle with hover spoiler
      if (showChoroplethHeat) {
        const radius = Math.min(Math.max(reg.utilizationCount * 30, 20000), 80000);
        const circle = L.circle([reg.lat, reg.lng], {
          radius: radius,
          color: statusColor.hex,
          fillColor: statusColor.hex,
          fillOpacity: isSelected ? 0.45 : 0.25,
          weight: isSelected ? 2.5 : 1.2,
        });

        circle.bindTooltip(spoilerHtml, {
          direction: 'top',
          sticky: true,
          opacity: 1,
          className: 'map-spoiler-tooltip'
        });

        circle.on('click', () => {
          setSelectedRegionId(reg.id);
        });

        circle.addTo(heatLayerGroupRef.current!);
      }

      // 2. Smaller Round Dot Marker (No numbers, round tab, colored by utilization level)
      const markerHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer; transform: translate(-50%, -50%);">
          ${isSelected ? `
            <div style="
              position: absolute; 
              width: 34px; 
              height: 34px; 
              border-radius: 50%; 
              background: ${statusColor.hex}; 
              opacity: 0.4; 
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
              pointer-events: none;
            "></div>
          ` : ''}
          <div style="
            width: 20px; 
            height: 20px; 
            background: ${statusColor.hex}; 
            border: 2px solid #ffffff; 
            border-radius: 50%; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.45), 0 0 10px ${statusColor.hex}80; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
          ">
            <div style="
              width: 6px; 
              height: 6px; 
              border-radius: 50%; 
              background: #ffffff; 
              box-shadow: 0 1px 2px rgba(0,0,0,0.35);
            "></div>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-round-dot-marker',
        html: markerHtml,
        iconSize: [20, 20],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([reg.lat, reg.lng], { icon: customIcon });

      // Hover Spoiler Tooltip (Triggered on mouse move / hover)
      marker.bindTooltip(spoilerHtml, {
        direction: 'top',
        offset: [0, -12],
        sticky: true,
        opacity: 1,
        className: 'map-spoiler-tooltip'
      });

      // Rich Click Popup
      const popupHtml = `
        <div style="min-width: 230px; font-family: ui-sans-serif, system-ui, sans-serif; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
            <strong style="font-size: 13px; color: #0f172a;">${reg.name}</strong>
            <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 9999px; background: ${reg.status === 'Tinggi' ? '#ecfdf5' : reg.status === 'Sedang' ? '#fffbeb' : '#f8fafc'}; color: ${reg.status === 'Tinggi' ? '#047857' : reg.status === 'Sedang' ? '#b45309' : '#475569'}; border: 1px solid #cbd5e1;">
              ${reg.status}
            </span>
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
            <div>Wilayah/Pulau: <strong style="color: #4f46e5;">${reg.island}</strong></div>
            <div style="margin-top: 3px;">Pemanfaatan: <strong style="color: #059669; font-size: 13px;">${reg.utilizationCount.toLocaleString('id-ID')}</strong> (${calcFormula})</div>
            <div style="color: #64748b; font-size: 10px; margin-top: 2px;">Porsi: <strong>${reg.percentage.toFixed(1)}%</strong> dari total ${totalTableUtilization.toLocaleString('id-ID')} pemanfaatan.</div>
            <div style="color: #64748b; font-size: 10px; margin-top: 4px;">${reg.description}</div>
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-bottom: 8px;">
            Koordinat: ${reg.lat.toFixed(4)}, ${reg.lng.toFixed(4)}
          </div>
          <div style="display: flex; gap: 6px;">
            <a href="https://www.google.com/maps/search/?api=1&query=${reg.lat},${reg.lng}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; background: #4f46e5; color: white; text-decoration: none; font-size: 10px; font-weight: 700; padding: 5px 8px; border-radius: 6px;">
              Buka di Google Maps &rarr;
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { closeButton: true, offset: [0, -16] });

      marker.on('click', () => {
        setSelectedRegionId(reg.id);
      });

      marker.addTo(markersLayerGroupRef.current!);
    });
  }, [filteredRegions, selectedRegionId, showChoroplethHeat]);

  // Fly to selected island or region
  const handleSelectIsland = (island: string) => {
    setSelectedIsland(island);
    if (!mapInstanceRef.current) return;

    const preset = ISLAND_PRESETS[island] || ISLAND_PRESETS['Semua'];
    mapInstanceRef.current.flyTo(preset.center, preset.zoom, {
      duration: 1.2,
      easeLinearity: 0.25,
    });
  };

  const handleFocusRegion = (reg: RegionDetail) => {
    setSelectedRegionId(reg.id);
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.flyTo([reg.lat, reg.lng], 9, {
      duration: 1.0,
      easeLinearity: 0.25,
    });
  };

  const handleResetMapBounds = () => {
    setSelectedIsland('Semua');
    setSearchQuery('');
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo(ISLAND_PRESETS['Semua'].center, ISLAND_PRESETS['Semua'].zoom, {
      duration: 1.0,
    });
  };

  const handleOpenAdd = () => {
    setEditingRegion(null);
    setFormData({
      name: '',
      island: selectedIsland !== 'Semua' ? selectedIsland : 'Jawa',
      utilizationCount: 500,
      status: 'Sedang',
      description: 'Keterangan wilayah baru...',
      lat: -6.2088,
      lng: 106.8456
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (reg: RegionDetail) => {
    setEditingRegion(reg);
    setFormData({
      name: reg.name,
      island: reg.island,
      utilizationCount: reg.utilizationCount,
      status: reg.status,
      description: reg.description,
      lat: reg.lat,
      lng: reg.lng
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data kabupaten/kota ini dari peta?')) {
      setRegions(prev => prev.filter(r => r.id !== id));
      if (selectedRegionId === id) {
        const remaining = regions.filter(r => r.id !== id);
        if (remaining.length > 0) setSelectedRegionId(remaining[0].id);
      }
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingRegion) {
      setRegions(prev => prev.map(r => r.id === editingRegion.id ? {
        ...r,
        name: formData.name,
        island: formData.island,
        utilizationCount: Number(formData.utilizationCount),
        status: formData.status,
        description: formData.description,
        lat: Number(formData.lat),
        lng: Number(formData.lng)
      } : r));
    } else {
      const countVal = Number(formData.utilizationCount) || 0;
      const newReg: RegionDetail = {
        id: Date.now().toString(),
        name: formData.name,
        island: formData.island,
        utilizationCount: countVal,
        rowCount: 1,
        sumValue: countVal,
        percentage: 0,
        status: formData.status,
        description: formData.description,
        lat: Number(formData.lat),
        lng: Number(formData.lng)
      };
      setRegions(prev => [newReg, ...prev]);
      setSelectedRegionId(newReg.id);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([newReg.lat, newReg.lng], 9);
      }
    }
    setIsModalOpen(false);
  };

  return (
    <div id="indonesia-map-card-section" className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden mb-8 transition-all">
      {/* Top Header Bar */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-400 shadow-inner">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <span>Peta Medan / Relief Topografi Wilayah Indonesia</span>
              <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                Indikator nmkckeluhan
              </span>
            </h3>
            <p className="text-xs text-slate-300">Peta topografi elevasi Indonesia. Indikator titik wilayah otomatis tersinkronisasi berdasarkan nmkckeluhan (Kantor Cabang Keluhan) dari file upload.</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1 rounded-xl bg-white/10 text-xs font-semibold border border-white/15 text-slate-200 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-300" />
            <span>{regions.length > 0 ? `${regions.length} nmkckeluhan Tersinkronisasi` : 'Peta Dasar (Data Kosong)'}</span>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-500/80 text-white/80 hover:text-white border border-white/15 transition-all cursor-pointer"
              title="Sembunyikan Peta"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Top Ranking Filter & Island Navigation Tabs Bar */}
      <div className="bg-slate-100/95 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        {/* Top 10 / Bottom 10 Filter Quick Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 mr-1 shrink-0 flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-600" />
            Peringkat:
          </span>
          <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
            <button
              type="button"
              onClick={() => setRankingFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                rankingFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Semua ({regions.length})
            </button>
            <button
              type="button"
              onClick={() => setRankingFilter('top10')}
              className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                rankingFilter === 'top10'
                  ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-500'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>10 Top</span>
            </button>
            <button
              type="button"
              onClick={() => setRankingFilter('bottom10')}
              className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                rankingFilter === 'bottom10'
                  ? 'bg-slate-700 text-white shadow-xs ring-1 ring-slate-600'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>10 Bottom</span>
            </button>
          </div>
        </div>

        {/* Island Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5">
          <span className="text-xs font-bold text-slate-700 mr-1 shrink-0 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-indigo-600" />
            Pulau:
          </span>
          {islandsList.map(island => (
            <button
              key={island}
              type="button"
              onClick={() => handleSelectIsland(island)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                selectedIsland === island
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {island}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[180px] shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nmkckeluhan..."
            className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Layout: Left Sidebar (List & CRUD), Right Main Area (Realistic Map) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        
        {/* Left Sidebar: nmkckeluhan Explorer & CRUD Controls (4 Cols) */}
        <div className="lg:col-span-4 border-r border-slate-200 bg-slate-50/60 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>nmkckeluhan (Kantor Cabang)</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  {rankingFilter === 'top10' ? '10 Top Pemanfaatan Tertinggi' : rankingFilter === 'bottom10' ? '10 Bottom Pemanfaatan Terendah' : `Menampilkan ${filteredRegions.length} titik nmkckeluhan`}
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Titik</span>
              </button>
            </div>

            {/* Region Cards List */}
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {filteredRegions.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl bg-white border border-dashed border-slate-300">
                  <Compass className="w-10 h-10 text-amber-500/60 mx-auto mb-3 animate-pulse" />
                  <h5 className="text-xs font-bold text-slate-800 mb-1">Data nmkckeluhan Kosong</h5>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto mb-3">
                    Peta menampilkan gambar medan/relief topografi Indonesia. Upload file Excel/CSV atau tambah data nmkckeluhan secara manual untuk melihat titik wilayah.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Input nmkckeluhan</span>
                  </button>
                </div>
              ) : (
                filteredRegions.map((reg, idx) => {
                  const isSelected = reg.id === selectedRegionId;
                  const statusStyle = getStatusColor(reg.status);
                  const isFiltered = selectedRegionFilter.includes(reg.name);

                  return (
                    <div
                      key={reg.id}
                      onClick={() => handleFocusRegion(reg)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
                        isSelected 
                          ? 'bg-white border-amber-500 shadow-md ring-2 ring-amber-500/20' 
                          : 'bg-white/90 border-slate-200 hover:bg-white hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          {rankingFilter !== 'all' ? (
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 ${
                              rankingFilter === 'top10' 
                                ? (idx < 3 ? 'bg-amber-500 shadow-xs' : 'bg-emerald-600') 
                                : 'bg-slate-700'
                            }`}>
                              #{idx + 1}
                            </span>
                          ) : (
                            <span className={`w-3 h-3 rounded-full ${statusStyle.bg} shadow-xs shrink-0`}></span>
                          )}
                          <h5 className="text-xs font-bold text-slate-900">{reg.name}</h5>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyle.badgeBg}`}>
                          {reg.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                        <span className="font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">Pulau: {reg.island}</span>
                        <span>Pemanfaatan: <strong className="text-slate-900 font-bold">{reg.utilizationCount.toLocaleString()}</strong></span>
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-1 mb-2">{reg.description}</p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                        <span className="text-[10px] text-slate-400 font-mono">({reg.lat.toFixed(2)}, {reg.lng.toFixed(2)})</span>
                        
                        <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          {onSelectRegionFilter && (
                            <button
                              type="button"
                              onClick={() => onSelectRegionFilter(reg.name)}
                              className={`p-1 rounded-lg border text-[10px] font-semibold px-2 transition-colors cursor-pointer ${
                                isFiltered ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                              }`}
                              title="Terapkan Filter Dashboard"
                            >
                              Filter
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(reg)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-700 border border-slate-200 transition-colors cursor-pointer"
                            title="Edit Rincian"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(reg.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer"
                            title="Hapus Titik"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span>Fokus Aktif: <strong className="text-amber-700 font-bold">{selectedRegion ? selectedRegion.name : 'Peta Relief Keseluruhan'}</strong></span>
            <span className="text-[10px] text-slate-400">OpenTopoMap Relief</span>
          </div>
        </div>

        {/* Right Main Area: Realistic Terrain Relief Map Container (8 Cols) */}
        <div className="lg:col-span-8 p-5 flex flex-col justify-between relative bg-slate-900 text-white">
          
          {/* Map Top Control Bar: Terrain Mode Badge & Choropleth Legends */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 z-10">
            {/* Mode Tag */}
            <div className="flex items-center gap-2 bg-slate-800/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 shadow-md">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></div>
              <Compass className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-300">Mode Peta: Medan / Relief Topografi</span>
              <span className="text-[10px] text-slate-400 border-l border-slate-700 pl-2">SRTM 30m Elevation</span>
            </div>

            {/* Choropleth Toggle & Legends */}
            <div className="flex items-center gap-3">
              {regions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowChoroplethHeat(!showChoroplethHeat)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    showChoroplethHeat 
                      ? 'bg-amber-600/30 text-amber-300 border-amber-500/50' 
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                  title="Tampilkan / Sembunyikan lingkaran densitas pemanfaatan"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Heat Choropleth</span>
                </button>
              )}

              <div className="flex items-center gap-2.5 bg-slate-800/90 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-700 text-[11px]">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  <span className="text-slate-200 font-medium">Tinggi</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="text-slate-200 font-medium">Sedang</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                  <span className="text-slate-200 font-medium">Rendah</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Leaflet Realistic Map Container */}
          <div className="relative flex-1 w-full min-h-[460px] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-950">
            {/* The actual Leaflet DOM Canvas */}
            <div ref={mapContainerRef} className="w-full h-full min-h-[460px] z-0" />

            {/* Custom Navigation Controls Overlay */}
            <div className="absolute bottom-6 right-4 flex flex-col gap-1.5 z-[1000]">
              <button
                type="button"
                onClick={() => {
                  if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
                }}
                className="w-8 h-8 rounded-lg bg-white/95 text-slate-800 hover:bg-white shadow-lg flex items-center justify-center border border-slate-300 font-bold transition-transform active:scale-95 cursor-pointer"
                title="Perbesar (Zoom In)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
                }}
                className="w-8 h-8 rounded-lg bg-white/95 text-slate-800 hover:bg-white shadow-lg flex items-center justify-center border border-slate-300 font-bold transition-transform active:scale-95 cursor-pointer"
                title="Perkecil (Zoom Out)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetMapBounds}
                className="w-8 h-8 rounded-lg bg-white/95 text-amber-700 hover:bg-white shadow-lg flex items-center justify-center border border-slate-300 font-bold transition-transform active:scale-95 cursor-pointer mt-1"
                title="Pusatkan Peta Nusantara"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bottom Attribution Watermark */}
            <div className="absolute bottom-2 left-3 text-[10px] text-slate-400 bg-slate-950/80 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-800 flex items-center gap-2 pointer-events-none z-[1000]">
              <span className="font-black text-amber-300">Medan / Relief Topografi</span>
              <span>&bull;</span>
              <span>Elevasi Kontur Indonesia &copy; 2026</span>
            </div>
          </div>

          {/* Bottom Quick Detail Bar for Selected Region or Empty State */}
          <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            {selectedRegion ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-amber-600/30 text-amber-300 border border-amber-500/30">
                    <MapPin className="w-4 h-4 text-amber-400" />
                  </span>
                  <div>
                    <h5 className="font-bold text-white flex items-center gap-2">
                      <span>{selectedRegion.name}</span>
                      <span className="text-[11px] font-normal text-amber-300">({selectedRegion.island})</span>
                    </h5>
                    <p className="text-[11px] text-slate-300">{selectedRegion.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Total Pemanfaatan</span>
                    <strong className="text-sm font-black text-emerald-400">{selectedRegion.utilizationCount.toLocaleString('id-ID')} Layanan</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Status Grouping</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${getStatusColor(selectedRegion.status).badgeBg}`}>
                      {selectedRegion.status}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between w-full text-slate-400">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Peta topografi/relief siap digunakan. Belum ada data kabupaten/kota yang tersinkronisasi dari file upload.</span>
                </div>
                <span className="text-[11px] font-semibold text-amber-300">Data Default: Kosong</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* CRUD Modal for Add / Edit nmkckeluhan Detail */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-400" />
                <span>{editingRegion ? 'Edit Data nmkckeluhan' : 'Tambah Data nmkckeluhan Baru'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nama nmkckeluhan (Kantor Cabang)</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: KC Jakarta Pusat, KC Bandung, KC Surabaya"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Pulau / Wilayah</label>
                  <select
                    value={formData.island}
                    onChange={(e) => setFormData({ ...formData, island: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-semibold"
                  >
                    {islandsList.filter(i => i !== 'Semua').map(island => (
                      <option key={island} value={island}>{island}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Jumlah Pemanfaatan / Layanan</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.utilizationCount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      let status: 'Tinggi' | 'Sedang' | 'Rendah' = 'Sedang';
                      if (val > 1200) status = 'Tinggi';
                      else if (val < 600) status = 'Rendah';
                      setFormData({ ...formData, utilizationCount: val, status });
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Grouping Pemanfaatan</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Tinggi' | 'Sedang' | 'Rendah' })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-bold"
                  >
                    <option value="Tinggi">Tinggi (&gt;1200)</option>
                    <option value="Sedang">Sedang (600-1200)</option>
                    <option value="Rendah">Rendah (&lt;600)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Keterangan / Deskripsi Singkat</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tuliskan keterangan layanan atau aktivitas kabupaten/kota ini..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Latitude (Koordinat)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Longitude (Koordinat)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.lng}
                    onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
