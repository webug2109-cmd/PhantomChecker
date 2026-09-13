/**
 * Comprehensive Database of USA & Canadian Email Domains & Live IMAP / SMTP Configurations
 */

export const DOMAINS_DATABASE = [
  // ==========================================
  // 🇺🇸 UNITED STATES — MAJOR ISPS & PROVIDERS
  // ==========================================
  {
    domain: 'comcast.net',
    provider: 'Xfinity / Comcast',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.ge.xfinity.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://connect.xfinity.com/appsuite/',
    notes: 'Largest USA Cable & Broadband ISP (Xfinity Connect)'
  },
  {
    domain: 'att.net',
    provider: 'AT&T Mail',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.mail.att.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.yahoo.com/',
    notes: 'AT&T USA Telecommunications (Yahoo Hosted)'
  },
  {
    domain: 'sbcglobal.net',
    provider: 'SBC Global (AT&T)',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.mail.att.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.yahoo.com/',
    notes: 'Southwestern Bell / AT&T Regional ISP'
  },
  {
    domain: 'bellsouth.net',
    provider: 'BellSouth (AT&T)',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.mail.att.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.yahoo.com/',
    notes: 'BellSouth USA Southeast Regional ISP'
  },
  {
    domain: 'pacbell.net',
    provider: 'Pacific Bell (AT&T)',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.mail.att.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.yahoo.com/',
    notes: 'Pacific Bell California / Nevada ISP'
  },
  {
    domain: 'ameritech.net',
    provider: 'Ameritech (AT&T)',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.mail.att.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.yahoo.com/',
    notes: 'Midwestern USA Regional Bell ISP'
  },
  {
    domain: 'swbell.net',
    provider: 'Southwestern Bell (AT&T)',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.mail.att.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.yahoo.com/',
    notes: 'Southwestern Bell Texas / Midwest ISP'
  },
  {
    domain: 'nvbell.net',
    provider: 'Nevada Bell (AT&T)',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.mail.att.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.yahoo.com/',
    notes: 'Nevada Bell Regional Telecom'
  },
  {
    domain: 'prodigy.net',
    provider: 'Prodigy Internet (AT&T)',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.mail.att.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.yahoo.com/',
    notes: 'Prodigy Internet USA Legacy Service'
  },
  {
    domain: 'flash.net',
    provider: 'Flash.net (AT&T)',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.mail.att.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.yahoo.com/',
    notes: 'Flash.net USA ISP'
  },
  {
    domain: 'verizon.net',
    provider: 'Verizon Online (AOL)',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.aol.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.aol.com/',
    notes: 'Verizon Communications USA (AOL Hosted)'
  },
  {
    domain: 'aol.com',
    provider: 'AOL Mail',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.aol.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.aol.com/',
    notes: 'America Online Webmail USA'
  },
  {
    domain: 'aim.com',
    provider: 'AOL AIM Mail',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.aol.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.aol.com/',
    notes: 'AOL Instant Messenger USA Webmail'
  },
  {
    domain: 'charter.net',
    provider: 'Spectrum / Charter',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'mobile.charter.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://www.spectrum.net/login/',
    notes: 'Charter Communications Spectrum USA'
  },
  {
    domain: 'spectrum.net',
    provider: 'Spectrum Internet',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'mobile.charter.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://www.spectrum.net/login/',
    notes: 'Charter Spectrum USA Webmail Portal'
  },
  {
    domain: 'twc.com',
    provider: 'Time Warner Cable (Spectrum)',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'mail.twc.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.twc.com/',
    notes: 'Time Warner Cable USA Webmail'
  },
  {
    domain: 'roadrunner.com',
    provider: 'Road Runner (TWC / Spectrum)',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'mail.twc.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.twc.com/',
    notes: 'Road Runner High Speed Online USA'
  },
  {
    domain: 'rr.com',
    provider: 'Road Runner Regional (Spectrum)',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'mail.twc.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.twc.com/',
    notes: 'Road Runner Broadband USA'
  },
  {
    domain: 'brighthouse.com',
    provider: 'Bright House Networks (Spectrum)',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'mail.brighthouse.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.spectrum.net/',
    notes: 'Bright House Networks Florida / USA'
  },
  {
    domain: 'cox.net',
    provider: 'Cox Communications',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.cox.net/',
    notes: 'Cox Cable & High Speed Internet USA (Yahoo Hosted)'
  },
  {
    domain: 'centurylink.net',
    provider: 'CenturyLink / Lumen',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'mail.centurylink.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.centurylink.net/',
    notes: 'CenturyLink USA Telecommunications'
  },
  {
    domain: 'embarqmail.com',
    provider: 'Embarq (CenturyLink)',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'mail.centurylink.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.centurylink.net/',
    notes: 'Embarq Corporation USA Regional Telecom'
  },
  {
    domain: 'qwest.net',
    provider: 'Qwest Communications (CenturyLink)',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'mail.centurylink.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.centurylink.net/',
    notes: 'Qwest Mountain West USA Regional Telecom'
  },
  {
    domain: 'centurytel.net',
    provider: 'CenturyTel (CenturyLink)',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'mail.centurylink.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.centurylink.net/',
    notes: 'CenturyTel Rural USA Telecom'
  },
  {
    domain: 'frontier.com',
    provider: 'Frontier Communications',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://login.frontier.com/webmail',
    notes: 'Frontier Fiber & Telecom USA'
  },
  {
    domain: 'frontiernet.net',
    provider: 'FrontierNet',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://login.frontier.com/webmail',
    notes: 'FrontierNet USA Internet'
  },
  {
    domain: 'windstream.net',
    provider: 'Windstream Communications',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.windstream.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.windstream.net/',
    notes: 'Windstream Kinetic Broadband USA'
  },
  {
    domain: 'earthlink.net',
    provider: 'EarthLink',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.earthlink.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.earthlink.net/',
    notes: 'EarthLink USA Pioneer ISP'
  },
  {
    domain: 'mindspring.com',
    provider: 'MindSpring (EarthLink)',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.earthlink.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.earthlink.net/',
    notes: 'MindSpring USA Internet'
  },
  {
    domain: 'optimum.net',
    provider: 'Optimum / Altice USA',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'mail.optimum.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.optimum.net/',
    notes: 'Optimum Cable / Altice New York Metro ISP'
  },
  {
    domain: 'optonline.net',
    provider: 'Optimum Online (Cablevision)',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'mail.optimum.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.optimum.net/',
    notes: 'Cablevision Optimum Online Tri-State ISP'
  },
  {
    domain: 'mediacombb.net',
    provider: 'Mediacom Broadband',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'mail.mediacombb.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.mediacombb.net/',
    notes: 'Mediacom Midwest & Southeast USA Cable ISP'
  },
  {
    domain: 'suddenlink.net',
    provider: 'Suddenlink (Optimum)',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.suddenlink.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://home.suddenlink.net/',
    notes: 'Suddenlink Communications Central USA'
  },
  {
    domain: 'wowway.com',
    provider: 'WOW! (WideOpenWest)',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'mail.wowway.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.wowway.com/',
    notes: 'WideOpenWest Cable & Internet USA'
  },
  {
    domain: 'fuse.net',
    provider: 'Cincinnati Bell / Altafiber',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.fuse.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.fuse.net/',
    notes: 'Altafiber / Cincinnati Bell Ohio & Kentucky ISP'
  },
  {
    domain: 'zoomtown.com',
    provider: 'ZoomTown (Altafiber)',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.fuse.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.fuse.net/',
    notes: 'Cincinnati Bell ZoomTown DSL'
  },
  {
    domain: 'tds.net',
    provider: 'TDS Telecom',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'mail.tds.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://email.tds.net/',
    notes: 'Telephone and Data Systems USA Broadband'
  },
  {
    domain: 'mycci.net',
    provider: 'Consolidated Communications',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'mail.mycci.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.mycci.net/',
    notes: 'Consolidated Communications Fiber USA'
  },
  {
    domain: 'surewest.net',
    provider: 'SureWest (Consolidated)',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'mail.surewest.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.mycci.net/',
    notes: 'SureWest California / Kansas Telecom'
  },
  {
    domain: 'zoominternet.net',
    provider: 'Armstrong Cable',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.zoominternet.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.zoominternet.net/',
    notes: 'Armstrong Zoom Internet PA / MD / OH ISP'
  },
  {
    domain: 'buckeye-express.com',
    provider: 'Buckeye Broadband',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'mail.buckeye-express.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.buckeyebb.com/',
    notes: 'Buckeye CableSystem Ohio / Michigan'
  },
  {
    domain: 'juno.com',
    provider: 'Juno Online Services',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.juno.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.juno.com/',
    notes: 'United Online / Juno USA Webmail'
  },
  {
    domain: 'netzero.net',
    provider: 'NetZero',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.netzero.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.netzero.net/',
    notes: 'NetZero United Online USA Dial-up / DSL'
  },

  // Apple USA
  {
    domain: 'icloud.com',
    provider: 'Apple iCloud USA',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.mail.me.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://www.icloud.com/mail',
    notes: 'Apple iCloud Mail (App-Specific Password / 2FA)'
  },
  {
    domain: 'me.com',
    provider: 'Apple MobileMe',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.mail.me.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://www.icloud.com/mail',
    notes: 'Apple MobileMe Legacy Service'
  },
  {
    domain: 'mac.com',
    provider: 'Apple .Mac',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.mail.me.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://www.icloud.com/mail',
    notes: 'Apple .Mac USA Legacy Service'
  },

  // USA Major Universities (.edu)
  {
    domain: 'harvard.edu',
    provider: 'Harvard University',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://outlook.office365.com/owa/?login_hint=',
    notes: 'Harvard University (Microsoft 365)'
  },
  {
    domain: 'mit.edu',
    provider: 'MIT',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.exchange.mit.edu',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://owa.exchange.mit.edu/',
    notes: 'Massachusetts Institute of Technology Exchange'
  },
  {
    domain: 'stanford.edu',
    provider: 'Stanford University',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.stanford.edu/',
    notes: 'Stanford University Webmail'
  },
  {
    domain: 'berkeley.edu',
    provider: 'UC Berkeley',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://bmail.berkeley.edu/',
    notes: 'UC Berkeley bMail (Google Workspace)'
  },
  {
    domain: 'nyu.edu',
    provider: 'New York University',
    country: 'USA',
    countryCode: 'US',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://email.nyu.edu/',
    notes: 'NYU Home / Google Workspace'
  },

  // ==========================================
  // 🇨🇦 CANADA — MAJOR ISPS & PROVIDERS
  // ==========================================
  {
    domain: 'sympatico.ca',
    provider: 'Bell Sympatico',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'imap.bell.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.bell.net/',
    notes: 'Major Canadian ISP (Bell Webmail Portal)'
  },
  {
    domain: 'bell.net',
    provider: 'Bell Canada',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'imap.bell.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.bell.net/',
    notes: 'Bell Canada Webmail Portal'
  },
  {
    domain: 'bellaliant.net',
    provider: 'Bell Aliant',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'imap.bellaliant.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.bellaliant.net/',
    notes: 'Atlantic Canada Bell Aliant'
  },
  {
    domain: 'videotron.ca',
    provider: 'Vidéotron',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'imap.videotron.ca',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://courrierweb.videotron.ca/',
    notes: 'Quebec Major ISP (Courrier Web Vidéotron)'
  },
  {
    domain: 'videotron.qc.ca',
    provider: 'Vidéotron QC',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'imap.videotron.ca',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://courrierweb.videotron.ca/',
    notes: 'Vidéotron Quebec Webmail'
  },
  {
    domain: 'cogeco.ca',
    provider: 'Cogeco Cable',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'imap.cogeco.ca',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.cogeco.ca/',
    notes: 'Ontario & Quebec Cogeco Webmail'
  },
  {
    domain: 'cgocable.ca',
    provider: 'Cogeco Legacy',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'imap.cogeco.ca',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.cogeco.ca/',
    notes: 'Cogeco Cgocable Webmail'
  },
  {
    domain: 'shaw.ca',
    provider: 'Shaw Communications',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'imap.shaw.ca',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.shaw.ca/',
    notes: 'Western Canada ISP (Shaw Webmail)'
  },
  {
    domain: 'shawwave.ca',
    provider: 'Shaw Wave',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'imap.shaw.ca',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.shaw.ca/',
    notes: 'Shaw Wave Webmail'
  },
  {
    domain: 'telus.net',
    provider: 'Telus Mobility & Web',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.telus.net/',
    notes: 'Telus Webmail (Google Workspace backend)'
  },
  {
    domain: 'rogers.com',
    provider: 'Rogers Communications',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'mail.rogers.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.rogers.com/',
    notes: 'Rogers Yahoo Webmail Portal'
  },
  {
    domain: 'nl.rogers.com',
    provider: 'Rogers NL',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'mail.rogers.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.rogers.com/',
    notes: 'Rogers Newfoundland Webmail'
  },
  {
    domain: 'eastlink.ca',
    provider: 'Eastlink',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'imap.eastlink.ca',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://email.eastlink.ca/',
    notes: 'Maritimes Eastlink Webmail'
  },
  {
    domain: 'sasktel.net',
    provider: 'SaskTel',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'mail.sasktel.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.sasktel.net/',
    notes: 'Saskatchewan SaskTel Webmail'
  },
  {
    domain: 'mts.net',
    provider: 'MTS Allstream (Bell MTS)',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'mail.mts.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.mymts.net/',
    notes: 'Manitoba MTS Webmail'
  },
  {
    domain: 'mymts.net',
    provider: 'MyMTS',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'mail.mymts.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.mymts.net/',
    notes: 'Bell MTS Webmail'
  },
  {
    domain: 'execulink.com',
    provider: 'Execulink Telecom',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'imap.execulink.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.execulink.ca/',
    notes: 'Ontario Execulink Webmail'
  },
  {
    domain: 'start.ca',
    provider: 'Start.ca',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'imap.start.ca',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.start.ca/',
    notes: 'Start.ca Webmail'
  },
  {
    domain: 'teksavvy.com',
    provider: 'TekSavvy',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'mail.teksavvy.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.teksavvy.com/',
    notes: 'TekSavvy Webmail'
  },
  {
    domain: 'xplornet.com',
    provider: 'Xplore Inc.',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'imap.xplornet.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.xplornet.com/',
    notes: 'Rural Canadian Satellite Webmail'
  },
  {
    domain: 'xplornet.ca',
    provider: 'Xplornet CA',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'imap.xplornet.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.xplornet.com/'
  },
  {
    domain: 'cyberus.ca',
    provider: 'Cyberus Ottawa',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'mail.cyberus.ca',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.cyberus.ca/'
  },
  {
    domain: 'tbaytel.net',
    provider: 'Tbaytel',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'imap.tbaytel.net',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.tbaytel.net/'
  },
  // Canadian Universities
  {
    domain: 'utoronto.ca',
    provider: 'University of Toronto',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.utoronto.ca/',
    notes: 'U of T UTmail+ (Office 365)'
  },
  {
    domain: 'ubc.ca',
    provider: 'University of British Columbia',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'imap.ubc.ca',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://webmail.ubc.ca/',
    notes: 'UBC Webmail'
  },
  {
    domain: 'mcgill.ca',
    provider: 'McGill University',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://outlook.office365.com/owa/?login_hint=',
    notes: 'McGill Exchange Online'
  },
  {
    domain: 'uwaterloo.ca',
    provider: 'University of Waterloo',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://outlook.office365.com/owa/?login_hint=',
    notes: 'Waterloo Mail (M365)'
  },

  // ==========================================
  // 🌐 GLOBAL & TECH GIANTS (WEBMAIL / OWA)
  // ==========================================
  {
    domain: 'gmail.com',
    provider: 'Google Gmail',
    country: 'GLOBAL',
    countryCode: 'US',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.google.com/',
    notes: 'Google Mail (App Password or OAuth)'
  },
  {
    domain: 'googlemail.com',
    provider: 'Google Mail',
    country: 'GLOBAL',
    countryCode: 'US',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.google.com/',
    notes: 'Google Mail Global'
  },
  {
    domain: 'yahoo.com',
    provider: 'Yahoo Mail',
    country: 'GLOBAL',
    countryCode: 'US',
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.yahoo.com/',
    notes: 'Yahoo Global Mail (App Password / IMAP)'
  },
  {
    domain: 'ymail.com',
    provider: 'Yahoo Ymail',
    country: 'GLOBAL',
    countryCode: 'US',
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.yahoo.com/',
    notes: 'Yahoo Ymail Webmail'
  },
  {
    domain: 'rocketmail.com',
    provider: 'RocketMail (Yahoo)',
    country: 'GLOBAL',
    countryCode: 'US',
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://mail.yahoo.com/',
    notes: 'RocketMail Yahoo Heritage'
  },
  {
    domain: 'hotmail.com',
    provider: 'Hotmail (OWA)',
    country: 'GLOBAL',
    countryCode: 'US',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://outlook.live.com/owa/?login_hint=',
    notes: 'Microsoft Hotmail Global',
    isMicrosoft: true
  },
  {
    domain: 'hotmail.ca',
    provider: 'Hotmail Canada (OWA)',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://outlook.live.com/owa/?login_hint=',
    notes: 'Microsoft Hotmail Canadian TLD',
    isMicrosoft: true
  },
  {
    domain: 'outlook.com',
    provider: 'Outlook.com (OWA)',
    country: 'GLOBAL',
    countryCode: 'US',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://outlook.live.com/owa/?login_hint=',
    notes: 'Microsoft Outlook Global',
    isMicrosoft: true
  },
  {
    domain: 'outlook.ca',
    provider: 'Outlook Canada (OWA)',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://outlook.live.com/owa/?login_hint=',
    notes: 'Microsoft Outlook Canadian TLD',
    isMicrosoft: true
  },
  {
    domain: 'live.com',
    provider: 'Windows Live (OWA)',
    country: 'GLOBAL',
    countryCode: 'US',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://outlook.live.com/owa/?login_hint=',
    notes: 'Microsoft Live Global',
    isMicrosoft: true
  },
  {
    domain: 'live.ca',
    provider: 'Windows Live Canada (OWA)',
    country: 'CANADA',
    countryCode: 'CA',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://outlook.live.com/owa/?login_hint=',
    notes: 'Microsoft Live Canadian TLD',
    isMicrosoft: true
  },
  {
    domain: 'msn.com',
    provider: 'MSN (OWA)',
    country: 'GLOBAL',
    countryCode: 'US',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    useSsl: true,
    webmailUrl: 'https://outlook.live.com/owa/?login_hint=',
    notes: 'Microsoft MSN Legacy',
    isMicrosoft: true
  }
];

// Canadian domains database filter
export const CANADIAN_DOMAINS_DATABASE = DOMAINS_DATABASE.filter(d => d.country === 'CANADA' || d.countryCode === 'CA');

export const USA_DOMAINS_DATABASE = DOMAINS_DATABASE.filter(d => d.country === 'USA');

function hasDomainMatch(domain, targets) {
  return targets.some(t => domain === t || domain.endsWith('.' + t));
}

export function isCanadianEmail(email = '') {
  const clean = email.trim().toLowerCase();
  const domain = clean.split('@')[1];
  if (!domain) return false;
  if (domain.endsWith('.ca')) return true;
  return DOMAINS_DATABASE.some(item => (item.domain === domain || domain.endsWith('.' + item.domain)) && item.country === 'CANADA');
}

export function isUsaEmail(email = '') {
  const clean = email.trim().toLowerCase();
  const domain = clean.split('@')[1];
  if (!domain) return false;
  if (domain.endsWith('.us') || domain.endsWith('.edu')) return true;
  return DOMAINS_DATABASE.some(item => (item.domain === domain || domain.endsWith('.' + item.domain)) && item.country === 'USA');
}

export function getImapConfigForEmail(email = '') {
  const domain = email.trim().toLowerCase().split('@')[1] || '';
  const found = DOMAINS_DATABASE.find(item => item.domain === domain || domain.endsWith('.' + item.domain));
  if (found) return { host: found.imapHost, port: found.imapPort, ssl: found.useSsl };
  
  if (domain.endsWith('.ca')) return { host: `mail.${domain}`, port: 993, ssl: true };
  if (hasDomainMatch(domain, ['gmail.com', 'googlemail.com'])) return { host: 'imap.gmail.com', port: 993, ssl: true };
  if (hasDomainMatch(domain, ['yahoo.com', 'yahoo.ca', 'ymail.com', 'rocketmail.com'])) return { host: 'imap.mail.yahoo.com', port: 993, ssl: true };
  if (hasDomainMatch(domain, ['aol.com', 'aim.com', 'verizon.net'])) return { host: 'imap.aol.com', port: 993, ssl: true };
  if (hasDomainMatch(domain, ['att.net', 'sbcglobal.net', 'bellsouth.net', 'pacbell.net', 'ameritech.net', 'swbell.net', 'prodigy.net', 'flash.net', 'nvbell.net'])) {
    return { host: 'imap.mail.att.net', port: 993, ssl: true };
  }
  if (hasDomainMatch(domain, ['comcast.net', 'xfinity.com'])) return { host: 'imap.ge.xfinity.com', port: 993, ssl: true };
  if (hasDomainMatch(domain, ['charter.net', 'spectrum.net'])) return { host: 'mobile.charter.net', port: 993, ssl: true };
  if (hasDomainMatch(domain, ['twc.com', 'roadrunner.com', 'rr.com'])) return { host: 'mail.twc.com', port: 993, ssl: true };
  if (hasDomainMatch(domain, ['cox.net'])) return { host: 'imap.mail.yahoo.com', port: 993, ssl: true };
  if (hasDomainMatch(domain, ['centurylink.net', 'embarqmail.com', 'qwest.net'])) return { host: 'mail.centurylink.net', port: 993, ssl: true };
  if (hasDomainMatch(domain, ['optimum.net', 'optonline.net'])) return { host: 'mail.optimum.net', port: 993, ssl: true };
  if (hasDomainMatch(domain, ['earthlink.net', 'mindspring.com'])) return { host: 'imap.earthlink.net', port: 993, ssl: true };
  if (hasDomainMatch(domain, ['windstream.net'])) return { host: 'imap.windstream.net', port: 993, ssl: true };
  if (hasDomainMatch(domain, ['icloud.com', 'me.com', 'mac.com'])) return { host: 'imap.mail.me.com', port: 993, ssl: true };
  if (hasDomainMatch(domain, MS_DOMAINS)) {
    return { host: 'outlook.office365.com', port: 993, ssl: true };
  }
  return { host: `imap.${domain}`, port: 993, ssl: true };
}

const MS_DOMAINS = ['hotmail.ca', 'hotmail.com', 'live.ca', 'live.com', 'outlook.com', 'outlook.ca', 'msn.com', 'passport.com', 'passport.net'];

export function isMicrosoftDomain(email = '') {
  const domain = email.trim().toLowerCase().split('@')[1] || '';
  return hasDomainMatch(domain, MS_DOMAINS);
}

/**
 * Returns direct live webmail login portal URL for any email account.
 */
export function getWebmailUrl(email = '') {
  const clean = email.trim().toLowerCase();
  const domain = clean.split('@')[1] || '';

  if (isMicrosoftDomain(clean)) {
    return 'https://outlook.live.com/owa/?login_hint=' + encodeURIComponent(clean);
  }

  const found = DOMAINS_DATABASE.find(item => item.domain === domain);
  if (found && found.webmailUrl) {
    if (found.webmailUrl.endsWith('=')) {
      return found.webmailUrl + encodeURIComponent(clean);
    }
    return found.webmailUrl;
  }

  if (domain.includes('gmail') || domain.includes('googlemail')) {
    return 'https://mail.google.com/mail/u/?authuser=' + encodeURIComponent(clean);
  }
  if (domain.includes('yahoo') || domain.includes('ymail') || domain.includes('rocketmail')) {
    return 'https://mail.yahoo.com/';
  }
  if (domain.includes('aol') || domain.includes('aim') || domain.includes('verizon')) {
    return 'https://mail.aol.com/';
  }
  if (domain.includes('comcast')) {
    return 'https://connect.xfinity.com/appsuite/';
  }
  if (domain.includes('charter') || domain.includes('spectrum')) {
    return 'https://www.spectrum.net/login/';
  }
  if (domain.includes('twc') || domain.includes('roadrunner')) {
    return 'https://mail.twc.com/';
  }
  if (domain.endsWith('.ca')) {
    return `https://webmail.${domain}/`;
  }
  return `https://mail.${domain}/`;
}

/**
 * Returns human-readable provider name.
 */
export function getProviderName(email = '') {
  const clean = email.trim().toLowerCase();
  const domain = clean.split('@')[1] || '';
  const found = DOMAINS_DATABASE.find(item => item.domain === domain);
  if (found) return found.provider;
  if (isMicrosoftDomain(clean)) return 'Microsoft Outlook Web App (OWA)';
  if (domain.includes('gmail')) return 'Google Workspace / Gmail';
  if (domain.includes('yahoo')) return 'Yahoo Mail';
  if (domain.includes('aol')) return 'AOL Mail';
  if (domain.includes('comcast')) return 'Xfinity / Comcast';
  if (domain.includes('spectrum') || domain.includes('charter')) return 'Spectrum Internet';
  if (domain.endsWith('.ca')) return `${domain.replace('.ca', '').toUpperCase()} Canada Webmail`;
  return `${domain} Webmail`;
}

/**
 * Returns standard IMAP connection URI string.
 */
export function getImapUri(email = '', password = '') {
  const config = getImapConfigForEmail(email);
  return `imap://${encodeURIComponent(email)}:${encodeURIComponent(password)}@${config.host}:${config.port}`;
}

export function getOwaUrl(email = '') {
  return 'https://outlook.live.com/owa/?login_hint=' + encodeURIComponent(email);
}

export function getSmtpConfigForEmail(email = '') {
  const domain = email.trim().toLowerCase().split('@')[1] || '';
  if (domain.includes('sympatico') || domain.includes('bell')) return { host: 'smtphm.sympatico.ca', port: 587, secure: false };
  if (domain.includes('videotron')) return { host: 'relais.videotron.ca', port: 587, secure: false };
  if (domain.includes('cogeco') || domain.includes('cgocable')) return { host: 'smtp.cogeco.ca', port: 587, secure: false };
  if (domain.includes('shaw')) return { host: 'mail.shaw.ca', port: 587, secure: false };
  if (domain.includes('telus')) return { host: 'smtp.gmail.com', port: 587, secure: false };
  if (domain.includes('comcast')) return { host: 'smtp.comcast.net', port: 587, secure: false };
  if (domain.includes('att') || domain.includes('sbcglobal') || domain.includes('bellsouth')) return { host: 'smtp.mail.att.net', port: 465, secure: true };
  if (domain.includes('verizon') || domain.includes('aol')) return { host: 'smtp.aol.com', port: 465, secure: true };
  if (domain.includes('charter') || domain.includes('spectrum')) return { host: 'smtp.charter.net', port: 587, secure: false };
  if (domain.includes('twc') || domain.includes('roadrunner')) return { host: 'mail.twc.com', port: 587, secure: false };
  if (domain.includes('cox')) return { host: 'smtp.cox.net', port: 587, secure: false };
  if (domain.includes('centurylink')) return { host: 'smtp.centurylink.net', port: 587, secure: false };
  if (domain.includes('optimum') || domain.includes('optonline')) return { host: 'mail.optimum.net', port: 587, secure: false };
  if (domain.includes('gmail')) return { host: 'smtp.gmail.com', port: 587, secure: false };
  if (domain.includes('yahoo')) return { host: 'smtp.mail.yahoo.com', port: 465, secure: true };
  if (domain.includes('hotmail') || domain.includes('outlook') || domain.includes('live')) return { host: 'smtp.office365.com', port: 587, secure: false };
  return { host: `smtp.${domain}`, port: 587, secure: false };
}
