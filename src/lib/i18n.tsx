import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

export type Lang = "en" | "gu" | "hi";

export const LANGUAGES: { code: Lang; label: string }[] = [
	{ code: "en", label: "English" },
	{ code: "gu", label: "ગુજરાતી" },
	{ code: "hi", label: "हिन्दी" },
];

const STORAGE_KEY = "gsrtc-lang";

// Bundled translations keep language switching reliable: it has no network
// dependency and React renders the selected language itself.
export const MESSAGES: Record<Exclude<Lang, "en">, Record<string, string>> = {
	gu: {
		"10-digit mobile number": "10 અંકનો મોબાઇલ નંબર",
		"A redesign concept": "પુનઃડિઝાઇન ખ્યાલ",
		"About Us": "અમારા વિશે",
		Achievements: "સિદ્ધિઓ",
		"Advance Booking": "અગાઉથી બુકિંગ",
		"Agent Allotment": "એજન્ટ ફાળવણી",
		Alert: "ચેતવણી",
		"All Rights Reserved.": "સર્વ હકો સુરક્ષિત.",
		"Annual Audit Report": "વાર્ષિક ઓડિટ અહેવાલ",
		"Another passenger confirmed that seat first.":
			"બીજા મુસાફરે તે સીટ પહેલાં બુક કરી લીધી.",
		"AWT (Award Winning Teachers)": "AWT (પુરસ્કાર વિજેતા શિક્ષકો)",
		Awards: "પુરસ્કારો",
		"Back to home": "મુખ્ય પૃષ્ઠ પર પાછા જાઓ",
		"Blacklisted Agencies": "બ્લેકલિસ્ટ એજન્સીઓ",
		"Book bus tickets": "બસ ટિકિટ બુક કરો",
		"Booking Policies": "બુકિંગ નીતિઓ",
		"Booking Policy (English)": "બુકિંગ નીતિ (અંગ્રેજી)",
		"Browser compatibility:": "બ્રાઉઝર સુસંગતતા:",
		"Bus Enquiry": "બસ પૂછપરછ",
		"Bus Pass": "બસ પાસ",
		"Bus Pass Login": "બસ પાસ લૉગિન",
		"Cancel Ticket": "ટિકિટ રદ કરો",
		"Change language": "ભાષા બદલો",
		"Choose a date of journey before searching.":
			"શોધતા પહેલાં મુસાફરીની તારીખ પસંદ કરો.",
		"Choose both a source and destination before searching.":
			"શોધતા પહેલાં પ્રસ્થાન અને ગંતવ્ય બંને પસંદ કરો.",
		"Choose from the refreshed seat map.": "તાજા સીટ નકશામાંથી પસંદ કરો.",
		"Citizen's Rights (નાગરિક અધિકાર પત્ર)": "નાગરિક અધિકાર પત્ર",
		"Close navigation menu": "નેવિગેશન મેનૂ બંધ કરો",
		"Contact Us": "અમારો સંપર્ક કરો",
		"Corporate Office": "કોર્પોરેટ કચેરી",
		Corporation: "નિગમ",
		"Create account": "એકાઉન્ટ બનાવો",
		"Create your account": "તમારું એકાઉન્ટ બનાવો",
		"Creating account…": "એકાઉન્ટ બની રહ્યું છે…",
		"Date of journey": "મુસાફરીની તારીખ",
		Destination: "ગંતવ્ય",
		"Destination city": "ગંતવ્ય શહેર",
		"Development OTP:": "ડેવલપમેન્ટ OTP:",
		Divisions: "વિભાગો",
		"Divyang Booking": "દિવ્યાંગ બુકિંગ",
		Download: "ડાઉનલોડ",
		"Download Android App": "એન્ડ્રોઇડ એપ ડાઉનલોડ કરો",
		"Download iOS App": "iOS એપ ડાઉનલોડ કરો",
		"E-Top Status": "ઇ-ટોપ સ્થિતિ",
		"Electric Bus": "ઇલેક્ટ્રિક બસ",
		"Email & password": "ઇમેઇલ અને પાસવર્ડ",
		"Email address": "ઇમેઇલ સરનામું",
		"Enter a 10-digit mobile number.": "10 અંકનો માન્ય મોબાઇલ નંબર દાખલ કરો.",
		"Enter a valid email address.": "માન્ય ઇમેઇલ સરનામું દાખલ કરો.",
		"Enter a valid name and age for this traveller.":
			"આ મુસાફર માટે માન્ય નામ અને ઉંમર દાખલ કરો.",
		FAQs: "વારંવાર પૂછાતા પ્રશ્નો",
		"Full name": "પૂરું નામ",
		"Grievance Redressal Officers (Divyang)": "ફરિયાદ નિવારણ અધિકારીઓ (દિવ્યાંગ)",
		"GSRTC / Agent Login": "GSRTC / એજન્ટ લૉગિન",
		"GSRTC Direct Agents List": "GSRTC સીધા એજન્ટોની યાદી",
		"GSRTC Franchisee Agents List": "GSRTC ફ્રેન્ચાઇઝી એજન્ટોની યાદી",
		"GSRTC Login": "GSRTC લૉગિન",
		"Gujarat Pavitra Yatradham Vikas Board": "ગુજરાત પવિત્ર યાત્રાધામ વિકાસ બોર્ડ",
		"Gujarat State Road Transport": "ગુજરાત રાજ્ય માર્ગ વાહન વ્યવહાર",
		"Gujarat State Road Transport Corporation. Steering miles with smiles since 1960.":
			"ગુજરાત રાજ્ય માર્ગ વાહન વ્યવહાર નિગમ. 1960થી સ્મિત સાથે મુસાફરીને આગળ ધપાવતું.",
		Home: "મુખ્ય પૃષ્ઠ",
		"India Code": "ઇન્ડિયા કોડ",
		Leadership: "નેતૃત્વ",
		"Mobile account": "મોબાઇલ એકાઉન્ટ",
		"Mobile number": "મોબાઇલ નંબર",
		"Mobile OTP": "મોબાઇલ OTP",
		"MP / MLA Booking": "સાંસદ / ધારાસભ્ય બુકિંગ",
		"My profile": "મારી પ્રોફાઇલ",
		"New Agent Register": "નવા એજન્ટની નોંધણી",
		"New Commuter Bus Pass": "નવો પ્રવાસી બસ પાસ",
		"No matches for “{query}”.": "“{query}” માટે કોઈ મેળ નથી.",
		"One-time password": "એક-વખતનો પાસવર્ડ",
		"Online Users": "ઓનલાઇન વપરાશકર્તાઓ",
		"Open navigation menu": "નેવિગેશન મેનૂ ખોલો",
		"Origin city": "પ્રસ્થાન શહેર",
		"Page not found": "પૃષ્ઠ મળ્યું નથી",
		Pages: "પૃષ્ઠો",
		"Passenger Login": "મુસાફર લૉગિન",
		"Passenger sign in": "મુસાફર સાઇન ઇન",
		Password: "પાસવર્ડ",
		"Payment failed": "ચુકવણી નિષ્ફળ ગઈ",
		Performance: "કાર્યક્ષમતા",
		"Pick your seats again. They may still be free.":
			"તમારી સીટો ફરી પસંદ કરો. તે હજી ખાલી હોઈ શકે છે.",
		"Policies & Governance": "નીતિઓ અને શાસન",
		"Press Release": "પ્રેસ રિલીઝ",
		"Print / SMS Ticket": "ટિકિટ પ્રિન્ટ / SMS",
		"Privacy Policy": "ગોપનીયતા નીતિ",
		"Proactive Disclosure (RTI)": "સ્વૈચ્છિક જાહેરખબર (RTI)",
		"Public Information": "જાહેર માહિતી",
		"Quick actions": "ઝડપી સેવાઓ",
		Recruitment: "ભરતી",
		"Refund / Transaction Enquiry": "રિફંડ / વ્યવહાર પૂછપરછ",
		"Refund Complaint": "રિફંડ ફરિયાદ",
		"Reschedule My Journey": "મારી મુસાફરી ફરીથી નક્કી કરો",
		Resources: "સાધનો",
		"RTC Act": "RTC કાયદો",
		Search: "શોધો",
		"Search pages and actions…": "પૃષ્ઠો અને સેવાઓ શોધો…",
		"Search the site": "સાઇટમાં શોધો",
		"Search…": "શોધો…",
		Seats: "બેઠકો",
		"Seats are held for 10 minutes so they do not stay locked for others.":
			"સીટો 10 મિનિટ માટે રોકવામાં આવે છે જેથી તે અન્ય માટે અટકી ન રહે.",
		"Select the requested number of seats.": "વિનંતી કરેલી સંખ્યાની બેઠકો પસંદ કરો.",
		"Send OTP": "OTP મોકલો",
		"Sending OTP…": "OTP મોકલાઈ રહ્યો છે…",
		"Service Regulation": "સેવા નિયમન",
		"Sessions end after a period of inactivity.":
			"થોડા સમયની નિષ્ક્રિયતા પછી સત્ર સમાપ્ત થાય છે.",
		"Sharvan Tirth Darshan": "શ્રવણ તીર્થ દર્શન",
		"Sign in": "સાઇન ઇન",
		"Sign in again. Your booking details are saved.":
			"ફરી સાઇન ઇન કરો. તમારી બુકિંગ વિગતો સાચવેલી છે.",
		"Sign in instead": "તેના બદલે સાઇન ઇન કરો",
		"Sign in required": "સાઇન ઇન જરૂરી છે",
		"Sign in to continue.": "ચાલુ રાખવા માટે સાઇન ઇન કરો.",
		"Sign in with mobile OTP": "મોબાઇલ OTP વડે સાઇન ઇન કરો",
		"Sign in with your email and password, or use a one-time password sent to your mobile.":
			"ઇમેઇલ અને પાસવર્ડથી સાઇન ઇન કરો અથવા તમારા મોબાઇલ પર મોકલવામાં આવેલ એક-વખતના પાસવર્ડનો ઉપયોગ કરો.",
		"Sign in with your registered email address.":
			"તમારા નોંધાયેલ ઇમેઇલ સરનામાથી સાઇન ઇન કરો.",
		"Sign out": "સાઇન આઉટ",
		"Sign-in method": "સાઇન ઇન પદ્ધતિ",
		"Signing in…": "સાઇન ઇન થઈ રહ્યું છે…",
		"Signing out…": "સાઇન આઉટ થઈ રહ્યું છે…",
		"Single Lady": "એકલી મહિલા",
		"Site search": "સાઇટ શોધ",
		Sitemap: "સાઇટમેપ",
		"Something broke on our side": "અમારી તરફ કંઈક ખોટું થયું છે",
		Source: "પ્રસ્થાન સ્થાન",
		"Special Services": "વિશેષ સેવાઓ",
		"Statue of Unity": "સ્ટેચ્યુ ઓફ યુનિટી",
		"Swap source and destination": "પ્રસ્થાન અને ગંતવ્ય બદલો",
		Tenders: "ટેન્ડરો",
		"That seat was just booked": "તે સીટ હમણાં જ બુક થઈ ગઈ",
		"This is not your fault and nothing was charged.":
			"આ તમારી ભૂલ નથી અને કોઈ રકમ લેવામાં આવી નથી.",
		"This page is part of the GSRTC redesign concept. The full experience is on its way. Check back soon.":
			"આ પૃષ્ઠ GSRTC પુનઃડિઝાઇન ખ્યાલનો ભાગ છે. સંપૂર્ણ અનુભવ ટૂંક સમયમાં આવશે.",
		"Toll Free": "ટોલ ફ્રી",
		"Too many attempts": "ખૂબ વધુ પ્રયત્નો",
		"Track your bus": "તમારી બસ ટ્રૅક કરો",
		"Try a different card or UPI ID.": "અલગ કાર્ડ અથવા UPI ID અજમાવો.",
		"Try again shortly. Quote reference {traceId} if you contact us.":
			"થોડી વારમાં ફરી પ્રયાસ કરો. સંપર્ક કરો તો સંદર્ભ {traceId} જણાવો.",
		"Try again while your seat hold is active.":
			"તમારી સીટ રોકાણ સક્રિય હોય ત્યારે ફરી પ્રયાસ કરો.",
		"Unity Booking": "સ્ટેચ્યુ ઓફ યુનિટી બુકિંગ",
		"Use an email address and a secure password.":
			"ઇમેઇલ સરનામું અને સુરક્ષિત પાસવર્ડ વાપરો.",
		"Verify and sign in": "ચકાસો અને સાઇન ઇન કરો",
		"Verifying…": "ચકાસાઈ રહ્યું છે…",
		"Version Details:": "સંસ્કરણ વિગતો:",
		"View History": "ઇતિહાસ જુઓ",
		"Wait a minute, then try once more.": "એક મિનિટ રાહ જુઓ, પછી ફરી પ્રયાસ કરો.",
		"Waiting List Ticket Status": "પ્રતીક્ષા યાદી ટિકિટ સ્થિતિ",
		"Wallet Account": "વોલેટ એકાઉન્ટ",
		"Wallet Passbook": "વોલેટ પાસબુક",
		"Welcome back": "ફરી સ્વાગત છે",
		"We’ll send a one-time password to verify your mobile number.":
			"તમારો મોબાઇલ નંબર ચકાસવા માટે અમે એક-વખતનો પાસવર્ડ મોકલીશું.",
		"Women Harassment Act 2013 (Circular 323)":
			"મહિલા ઉત્પીડન કાયદો 2013 (પરિપત્ર 323)",
		"You are signed in": "તમે સાઇન ઇન છો",
		"You have been signed out": "તમારું સાઇન આઉટ થઈ ગયું છે",
		"You have tried to lock seats several times in a row.":
			"તમે સતત ઘણી વખત સીટો રોકવાનો પ્રયત્ન કર્યો છે.",
		"Your bank declined the payment. No money left your account.":
			"તમારી બેંકે ચુકવણી નકારી. તમારા ખાતામાંથી કોઈ રકમ કપાઈ નથી.",
		"Your payment could not be completed. Nothing was charged.":
			"તમારી ચુકવણી પૂર્ણ થઈ શકી નથી. કોઈ રકમ લેવામાં આવી નથી.",
		"Your payment was declined": "તમારી ચુકવણી નકારવામાં આવી",
		"Your seat hold ran out": "તમારી સીટની રોકાણ અવધિ પૂરી થઈ ગઈ",
	},
	hi: {
		"10-digit mobile number": "10 अंकों का मोबाइल नंबर",
		"A redesign concept": "रीडिज़ाइन अवधारणा",
		"About Us": "हमारे बारे में",
		Achievements: "उपलब्धियां",
		"Advance Booking": "अग्रिम बुकिंग",
		"Agent Allotment": "एजेंट आवंटन",
		Alert: "सूचना",
		"All Rights Reserved.": "सर्वाधिकार सुरक्षित।",
		"Annual Audit Report": "वार्षिक लेखा परीक्षा रिपोर्ट",
		"Another passenger confirmed that seat first.":
			"किसी दूसरे यात्री ने वह सीट पहले बुक कर ली।",
		"AWT (Award Winning Teachers)": "AWT (पुरस्कार विजेता शिक्षक)",
		Awards: "पुरस्कार",
		"Back to home": "होम पर वापस जाएं",
		"Blacklisted Agencies": "ब्लैकलिस्टेड एजेंसियां",
		"Book bus tickets": "बस टिकट बुक करें",
		"Booking Policies": "बुकिंग नीतियां",
		"Booking Policy (English)": "बुकिंग नीति (अंग्रेज़ी)",
		"Browser compatibility:": "ब्राउज़र संगतता:",
		"Bus Enquiry": "बस पूछताछ",
		"Bus Pass": "बस पास",
		"Bus Pass Login": "बस पास लॉगिन",
		"Cancel Ticket": "टिकट रद्द करें",
		"Change language": "भाषा बदलें",
		"Choose a date of journey before searching.":
			"खोजने से पहले यात्रा की तारीख चुनें।",
		"Choose both a source and destination before searching.":
			"खोजने से पहले स्रोत और गंतव्य दोनों चुनें।",
		"Choose from the refreshed seat map.": "नए सीट मानचित्र से सीट चुनें।",
		"Citizen's Rights (નાગરિક અધિકાર પત્ર)": "नागरिक अधिकार पत्र",
		"Close navigation menu": "नेविगेशन मेनू बंद करें",
		"Contact Us": "संपर्क करें",
		"Corporate Office": "कॉर्पोरेट कार्यालय",
		Corporation: "निगम",
		"Create account": "खाता बनाएं",
		"Create your account": "अपना खाता बनाएं",
		"Creating account…": "खाता बनाया जा रहा है…",
		"Date of journey": "यात्रा की तारीख",
		Destination: "गंतव्य",
		"Destination city": "गंतव्य शहर",
		"Development OTP:": "डेवलपमेंट OTP:",
		Divisions: "विभाग",
		"Divyang Booking": "दिव्यांग बुकिंग",
		Download: "डाउनलोड",
		"Download Android App": "Android ऐप डाउनलोड करें",
		"Download iOS App": "iOS ऐप डाउनलोड करें",
		"E-Top Status": "ई-टॉप स्थिति",
		"Electric Bus": "इलेक्ट्रिक बस",
		"Email & password": "ईमेल और पासवर्ड",
		"Email address": "ईमेल पता",
		"Enter a 10-digit mobile number.": "10 अंकों का मान्य मोबाइल नंबर दर्ज करें।",
		"Enter a valid email address.": "मान्य ईमेल पता दर्ज करें।",
		"Enter a valid name and age for this traveller.":
			"इस यात्री के लिए मान्य नाम और आयु दर्ज करें।",
		FAQs: "अक्सर पूछे जाने वाले प्रश्न",
		"Full name": "पूरा नाम",
		"Grievance Redressal Officers (Divyang)": "शिकायत निवारण अधिकारी (दिव्यांग)",
		"GSRTC / Agent Login": "GSRTC / एजेंट लॉगिन",
		"GSRTC Direct Agents List": "GSRTC प्रत्यक्ष एजेंट सूची",
		"GSRTC Franchisee Agents List": "GSRTC फ्रैंचाइज़ी एजेंट सूची",
		"GSRTC Login": "GSRTC लॉगिन",
		"Gujarat Pavitra Yatradham Vikas Board": "गुजरात पवित्र यात्राधाम विकास बोर्ड",
		"Gujarat State Road Transport": "गुजरात राज्य सड़क परिवहन",
		"Gujarat State Road Transport Corporation. Steering miles with smiles since 1960.":
			"गुजरात राज्य सड़क परिवहन निगम। 1960 से मुस्कान के साथ यात्राओं को आगे बढ़ाते हुए।",
		Home: "होम",
		"India Code": "इंडिया कोड",
		Leadership: "नेतृत्व",
		"Mobile account": "मोबाइल खाता",
		"Mobile number": "मोबाइल नंबर",
		"Mobile OTP": "मोबाइल OTP",
		"MP / MLA Booking": "सांसद / विधायक बुकिंग",
		"My profile": "मेरी प्रोफ़ाइल",
		"New Agent Register": "नया एजेंट पंजीकरण",
		"New Commuter Bus Pass": "नया यात्री बस पास",
		"No matches for “{query}”.": "“{query}” के लिए कोई परिणाम नहीं।",
		"One-time password": "एक-बार का पासवर्ड",
		"Online Users": "ऑनलाइन उपयोगकर्ता",
		"Open navigation menu": "नेविगेशन मेनू खोलें",
		"Origin city": "प्रस्थान शहर",
		"Page not found": "पृष्ठ नहीं मिला",
		Pages: "पृष्ठ",
		"Passenger Login": "यात्री लॉगिन",
		"Passenger sign in": "यात्री साइन इन",
		Password: "पासवर्ड",
		"Payment failed": "भुगतान विफल हो गया",
		Performance: "प्रदर्शन",
		"Pick your seats again. They may still be free.":
			"अपनी सीटें फिर चुनें। वे अभी भी खाली हो सकती हैं।",
		"Policies & Governance": "नीतियां और प्रशासन",
		"Press Release": "प्रेस विज्ञप्ति",
		"Print / SMS Ticket": "टिकट प्रिंट / SMS",
		"Privacy Policy": "गोपनीयता नीति",
		"Proactive Disclosure (RTI)": "स्वैच्छिक प्रकटीकरण (RTI)",
		"Public Information": "सार्वजनिक जानकारी",
		"Quick actions": "त्वरित सेवाएं",
		Recruitment: "भर्ती",
		"Refund / Transaction Enquiry": "रिफंड / लेनदेन पूछताछ",
		"Refund Complaint": "रिफंड शिकायत",
		"Reschedule My Journey": "मेरी यात्रा पुनर्निर्धारित करें",
		Resources: "संसाधन",
		"RTC Act": "RTC अधिनियम",
		Search: "खोजें",
		"Search pages and actions…": "पेज और सेवाएं खोजें…",
		"Search the site": "साइट खोजें",
		"Search…": "खोजें…",
		Seats: "सीटें",
		"Seats are held for 10 minutes so they do not stay locked for others.":
			"सीटें 10 मिनट के लिए होल्ड रहती हैं ताकि वे दूसरों के लिए बंद न रहें।",
		"Select the requested number of seats.": "अनुरोधित संख्या में सीटें चुनें।",
		"Send OTP": "OTP भेजें",
		"Sending OTP…": "OTP भेजा जा रहा है…",
		"Service Regulation": "सेवा विनियमन",
		"Sessions end after a period of inactivity.":
			"कुछ समय निष्क्रिय रहने पर सत्र समाप्त हो जाते हैं।",
		"Sharvan Tirth Darshan": "श्रवण तीर्थ दर्शन",
		"Sign in": "साइन इन",
		"Sign in again. Your booking details are saved.":
			"फिर साइन इन करें। आपकी बुकिंग जानकारी सुरक्षित है।",
		"Sign in instead": "इसके बजाय साइन इन करें",
		"Sign in required": "साइन इन आवश्यक है",
		"Sign in to continue.": "जारी रखने के लिए साइन इन करें।",
		"Sign in with mobile OTP": "मोबाइल OTP से साइन इन करें",
		"Sign in with your email and password, or use a one-time password sent to your mobile.":
			"अपने ईमेल और पासवर्ड से साइन इन करें, या मोबाइल पर भेजे गए एक-बार के पासवर्ड का उपयोग करें।",
		"Sign in with your registered email address.":
			"अपने पंजीकृत ईमेल पते से साइन इन करें।",
		"Sign out": "साइन आउट",
		"Sign-in method": "साइन इन विधि",
		"Signing in…": "साइन इन हो रहा है…",
		"Signing out…": "साइन आउट हो रहा है…",
		"Single Lady": "एकल महिला",
		"Site search": "साइट खोज",
		Sitemap: "साइटमैप",
		"Something broke on our side": "हमारी ओर से कुछ गड़बड़ हो गई",
		Source: "प्रस्थान स्थान",
		"Special Services": "विशेष सेवाएं",
		"Statue of Unity": "स्टैच्यू ऑफ यूनिटी",
		"Swap source and destination": "प्रस्थान और गंतव्य बदलें",
		Tenders: "निविदाएं",
		"That seat was just booked": "वह सीट अभी बुक हो गई",
		"This is not your fault and nothing was charged.":
			"यह आपकी गलती नहीं है और कोई पैसा नहीं काटा गया।",
		"This page is part of the GSRTC redesign concept. The full experience is on its way. Check back soon.":
			"यह पृष्ठ GSRTC रीडिज़ाइन अवधारणा का भाग है। पूरा अनुभव जल्द उपलब्ध होगा।",
		"Toll Free": "टोल फ्री",
		"Too many attempts": "बहुत अधिक प्रयास",
		"Track your bus": "अपनी बस ट्रैक करें",
		"Try a different card or UPI ID.": "कोई दूसरा कार्ड या UPI ID आज़माएं।",
		"Try again shortly. Quote reference {traceId} if you contact us.":
			"थोड़ी देर में फिर कोशिश करें। संपर्क करने पर संदर्भ {traceId} बताएं।",
		"Try again while your seat hold is active.":
			"सीट होल्ड सक्रिय रहते हुए दोबारा कोशिश करें।",
		"Unity Booking": "स्टैच्यू ऑफ यूनिटी बुकिंग",
		"Use an email address and a secure password.":
			"ईमेल पता और सुरक्षित पासवर्ड उपयोग करें।",
		"Verify and sign in": "सत्यापित करें और साइन इन करें",
		"Verifying…": "सत्यापित किया जा रहा है…",
		"Version Details:": "संस्करण विवरण:",
		"View History": "इतिहास देखें",
		"Wait a minute, then try once more.": "एक मिनट रुकें, फिर दोबारा कोशिश करें।",
		"Waiting List Ticket Status": "प्रतीक्षा सूची टिकट स्थिति",
		"Wallet Account": "वॉलेट खाता",
		"Wallet Passbook": "वॉलेट पासबुक",
		"Welcome back": "वापसी पर स्वागत है",
		"We’ll send a one-time password to verify your mobile number.":
			"आपका मोबाइल नंबर सत्यापित करने के लिए हम एक-बार का पासवर्ड भेजेंगे।",
		"Women Harassment Act 2013 (Circular 323)":
			"महिला उत्पीड़न अधिनियम 2013 (परिपत्र 323)",
		"You are signed in": "आप साइन इन हैं",
		"You have been signed out": "आप साइन आउट हो गए हैं",
		"You have tried to lock seats several times in a row.":
			"आपने लगातार कई बार सीटें लॉक करने की कोशिश की है।",
		"Your bank declined the payment. No money left your account.":
			"आपके बैंक ने भुगतान अस्वीकार किया। आपके खाते से कोई पैसा नहीं गया।",
		"Your payment could not be completed. Nothing was charged.":
			"आपका भुगतान पूरा नहीं हो सका। कोई पैसा नहीं काटा गया।",
		"Your payment was declined": "आपका भुगतान अस्वीकार कर दिया गया",
		"Your seat hold ran out": "आपकी सीट होल्ड की अवधि समाप्त हो गई",
	},
};

function interpolate(
	message: string,
	values?: Record<string, string | number>
) {
	if (!values) {
		return message;
	}
	return message.replace(/\{(\w+)\}/g, (match, name: string) => {
		const value = values[name];
		return value === undefined ? match : String(value);
	});
}

export function translate(
	lang: Lang,
	message: string,
	values?: Record<string, string | number>
): string {
	const localized =
		lang === "en" ? message : (MESSAGES[lang][message] ?? message);
	return interpolate(localized, values);
}

const LanguageContext = createContext<{
	lang: Lang;
	setLang: (lang: Lang) => void;
}>({ lang: "en", setLang: () => undefined });

export const useLanguage = () => useContext(LanguageContext);

export function useTranslation() {
	const { lang } = useLanguage();
	const t = useCallback(
		(message: string, values?: Record<string, string | number>) =>
			translate(lang, message, values),
		[lang]
	);
	return useMemo(() => ({ lang, t }), [lang, t]);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
	const [lang, setLangState] = useState<Lang>("en");

	useEffect(() => {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved && LANGUAGES.some((language) => language.code === saved)) {
			setLangState(saved as Lang);
		}
	}, []);

	useEffect(() => {
		document.documentElement.lang = lang;
	}, [lang]);

	const setLang = useCallback((next: Lang) => {
		localStorage.setItem(STORAGE_KEY, next);
		setLangState(next);
	}, []);
	const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);

	return (
		<LanguageContext.Provider value={value}>
			{children}
		</LanguageContext.Provider>
	);
}
