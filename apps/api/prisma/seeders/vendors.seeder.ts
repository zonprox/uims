import type { PrismaClient } from '@prisma/client';
import { runDomainSeeder, type SeederContext, upsertById } from './seeder.utils';

export interface CanonicalVendorDefinition {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  website: string;
  notes?: string;
  aliases?: string[];
}

const vendorRows: string[] = [
  'ven-msft|Microsoft Corporation|licensing@microsoft.com|+1-800-642-7676|https://microsoft.com|Primary enterprise operating systems, productivity and cloud subscription provider.|microsoft,microsoft corporation,msft,ven-ms,ven-msft',
  'ven-sap|SAP SE|enterprise-sales@sap.com|+49-6227-747474|https://sap.com|Global ERP solutions provider for manufacturing, supply chain and financials.|sap,sap se',
  'ven-lectra|Lectra|contact@lectra.com|+33-1-5364-4200|https://lectra.com|Industrial textile CAD/CAM pattern design, 3D prototyping and automated cutting systems.|lectra',
  'ven-gerber|Gerber Technology|service@gerbertechnology.com|+1-860-871-8082|https://gerbertechnology.com|Integrated garment manufacturing, pattern design and marker optimization software.|gerber,gerber technology',
  'ven-coats|Coats Digital|support@coatsdigital.com|+44-208-210-5000|https://coatsdigital.com|Supply chain management and FastReact production planning software.|coats,coats digital',
  'ven-adobe|Adobe Systems Inc|enterprise@adobe.com|+1-800-833-6687|https://adobe.com|Creative Cloud graphic design, technical illustration and digital media suite.|adobe,adobe systems,adobe systems inc',
  'ven-cisco|Cisco Systems|tac@cisco.com|+1-800-553-2447|https://cisco.com|Enterprise campus networking hardware, routing, SD-WAN and security infrastructure.|cisco,cisco systems,cisco meraki',
  'ven-dell|Dell Technologies|support@dell.com|+1-800-456-3355|https://dell.com|Enterprise server infrastructure, Precision workstations and Latitude mobile fleet.|dell,dell technologies',
  'ven-lenovo|Lenovo|sales@lenovo.com|+1-855-253-6686|https://lenovo.com|ThinkPad laptops, ThinkCentre desktops and enterprise mobile compute fleet.|lenovo',
  'ven-apple|Apple Inc|business@apple.com|+1-800-692-7753|https://apple.com|Executive MacBook Pro, iPad and mobile hardware ecosystem.|apple,apple inc',
  'ven-juki|Juki Corporation|sewing-support@juki.com|+81-42-357-2211|https://juki.co.jp|Industrial high-speed lockstitch, overlock sewing machines and automated sewing units.|juki,juki corporation,juki vietnam',
  'ven-brother|Brother Industries|machinery@brother.com|+81-52-824-2511|https://brother.com|Industrial automated embroidery machinery, buttonholers and garment sewing technology.|brother,brother industries',
  'ven-hp|HP Inc|support@hp.com|+1-800-474-6836|https://hp.com|Enterprise multifunction printers, scanners, and client computing systems.|hp,hp inc,hewlett packard,hp inc.',
  'ven-hpe|Hewlett Packard Enterprise|contact@hpe.com|+1-800-607-3567|https://hpe.com|Enterprise rackmount servers, ProLiant compute, and data center infrastructure.|hpe,hewlett packard enterprise',
  'ven-aruba|Aruba Networks|aruba-support@hpe.com|+1-800-943-4526|https://arubanetworks.com|Enterprise edge switching, campus Wi-Fi 6, and secure network access control.|aruba,aruba networks,aruba a hewlett packard enterprise company',
  'ven-fortinet|Fortinet Inc|support@fortinet.com|+1-866-868-3678|https://fortinet.com|Next-generation firewalls, FortiGate security appliances, and enterprise threat protection.|fortinet,fortinet inc',
  'ven-zebra|Zebra Technologies|support@zebra.com|+1-877-275-9327|https://zebra.com|Industrial thermal barcode printers, RFID readers, and rugged handheld terminals.|zebra,zebra technologies',
  'ven-synology|Synology Inc|support@synology.com|+1-425-818-1587|https://synology.com|Network Attached Storage (NAS), enterprise backup targets, and storage solutions.|synology,synology inc',
  'ven-schneider|Schneider Electric / APC|support@se.com|+1-800-788-5414|https://se.com|Uninterruptible power supplies (UPS), Smart-UPS RT, and data center power distribution.|schneider,schneider electric,apc,schneider electric / apc',
  'ven-honeywell|Honeywell International|support@honeywell.com|+1-800-582-4263|https://honeywell.com|Industrial handheld 2D barcode imagers and warehouse scanning solutions.|honeywell,honeywell international',
  'ven-hikvision|Hikvision Digital Technology|support@hikvision.com|+86-571-8807-5998|https://hikvision.com|Enterprise CCTV surveillance, 4K dome/bullet cameras, and biometric access control.|hikvision,hikvision digital technology',
  'ven-hanwha|Hanwha Vision|support@hanwhavision.com|+82-70-7147-8771|https://hanwhavision.com|Enterprise IP surveillance cameras, optical PTZ systems, and multi-channel NVRs.|hanwha,hanwha techwin,hanwha vision',
  'ven-axis|Axis Communications|support@axis.com|+46-46-272-1800|https://axis.com|High-performance network video surveillance, dome cameras, and outdoor PTZ cameras.|axis,axis communications',
  'ven-lg|LG Electronics|support@lg.com|+1-800-243-0000|https://lg.com|Commercial 4K Ultra HD IPS displays, industrial monitors, and workspace screens.|lg,lg electronics',
  'ven-jetbrains|JetBrains s.r.o.|sales@jetbrains.com|+420-241-722-501|https://jetbrains.com|Integrated Development Environments (IDEs), developer tools, and team productivity software.|jetbrains,jetbrains s.r.o.,ven-jetbrains',
  'ven-figma|Figma Inc|support@figma.com|+1-800-344-6201|https://figma.com|Collaborative cloud design platform, UI/UX prototyping, and design systems.|figma,figma inc,ven-figma',
  'ven-autodesk|Autodesk Inc|support@autodesk.com|+1-844-664-8618|https://autodesk.com|Computer-aided design (CAD), architectural drafting, and technical engineering software.|autodesk,autodesk inc,ven-autodesk',
];

export const CANONICAL_VENDORS: CanonicalVendorDefinition[] = vendorRows.map((r) => {
  const [id, name, contactEmail, contactPhone, website, notes, aliasStr] = r.split('|');
  return { id, name, contactEmail, contactPhone, website, notes, aliases: aliasStr.split(',') };
});

export async function seedVendors(
  prisma: PrismaClient,
  ctx?: SeederContext,
): Promise<Map<string, string>> {
  return runDomainSeeder(
    'VendorsSeeder',
    '🏢',
    'Enterprise Hardware & Software Vendors',
    async (logger) => {
      const vendorLookupMap = new Map<string, string>();

      for (const v of CANONICAL_VENDORS) {
        const record = await upsertById(prisma.vendor, {
          id: v.id,
          name: v.name,
          contactEmail: v.contactEmail,
          contactPhone: v.contactPhone,
          website: v.website,
          notes: v.notes,
        });

        vendorLookupMap.set(v.id, record.id);
        vendorLookupMap.set(v.name, record.id);
        vendorLookupMap.set(v.name.toLowerCase(), record.id);
        if (v.aliases) {
          for (const a of v.aliases) {
            vendorLookupMap.set(a, record.id);
            vendorLookupMap.set(a.toLowerCase(), record.id);
          }
        }

        if (ctx) {
          ctx.vendors.set(v.id, record.id);
          ctx.vendors.set(v.name, record.id);
          ctx.vendors.set(v.name.toLowerCase(), record.id);
          if (v.aliases) {
            for (const a of v.aliases) {
              ctx.vendors.set(a, record.id);
              ctx.vendors.set(a.toLowerCase(), record.id);
            }
          }
        }
      }

      logger.log(`✅ Seeded ${CANONICAL_VENDORS.length} Canonical Enterprise Vendors.`);
      return vendorLookupMap;
    },
  );
}
