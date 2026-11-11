"use client";
import * as React from "react";

export type Lang = "EN" | "HA";

const DICT: Record<Lang, Record<string,string>> = {
  EN: {
    dashboard: "Dashboard",
    overview: "Overview",
    bookings: "Booking Requests",
    customers: "My Customers",
    measurements: "Customer Measurements",
    measurementRecords: "Measurement Records",
    designs: "My Designs / Portfolio",
    production: "Active Production",
    completed: "Completed Orders",
    calendar: "Calendar & Availability",
    messages: "Messages",
    reviews: "Reviews",
    earnings: "Earnings & Payments",
    businessProfile: "Business Profile",
    locationSettings: "Location Settings",
    accountSettings: "Account Settings",
    addCustomer: "Add Customer",
    recordMeasurements: "Record Measurements",
    uploadDesign: "Upload New Design",
    viewBookings: "View New Bookings",
    updateProduction: "Update Production Status",
    save: "Save",
    saveMeasurements: "Save Measurements",
    updateMeasurements: "Update Measurements",
    uploadDesignAction: "Upload Design",
    shoulder: "Shoulder",
    chest: "Chest/Bust",
    waist: "Waist",
    hip: "Hip",
    sleeve: "Sleeve Length",
    inseam: "Inseam",
    thigh: "Thigh",
    neck: "Neck",
    searchCustomer: "Search customer",
    addWalkIn: "+ Add Walk-in Customer",
    darkMode: "Dark mode",
    lightMode: "Light mode",
  },
  HA: {
    dashboard: "Allon Dashboard",
    overview: "Bayyani",
    bookings: "Buƙatun Ɗinki",
    customers: "Abokan Ciniki",
    measurements: "Ma'aunan Abokan Ciniki",
    measurementRecords: "Bayanan Ma'auni",
    designs: "Zane-zanena",
    production: "Aikin Ɗinki",
    completed: "Ayyukan da aka Kammala",
    calendar: "Kalendar & Lokaci",
    messages: "Saƙonni",
    reviews: "Sharhi",
    earnings: "Kuɗi & Biyan Kuɗi",
    businessProfile: "Bayanan Kasuwanci",
    locationSettings: "Saitin Wuri",
    accountSettings: "Saitin Asusu",
    addCustomer: "Ƙara Abokin Ciniki",
    recordMeasurements: "Ɗauki Ma'auni",
    uploadDesign: "Ɗora Sabon Zane",
    viewBookings: "Duba Buƙatu",
    updateProduction: "Sabunta Matsayin Aiki",
    save: "Ajiye",
    saveMeasurements: "Ajiye Ma'auni",
    updateMeasurements: "Sabunta Ma'auni",
    uploadDesignAction: "Ɗora Zane",
    shoulder: "Kafaɗa",
    chest: "Ƙirji",
    waist: "Kugu",
    hip: "Kugu na Ƙasa",
    sleeve: "Tsawon Hannu",
    inseam: "Tsawon Ƙafa na Ciki",
    thigh: "Cinye",
    neck: "Wuya",
    searchCustomer: "Nemo abokin ciniki",
    addWalkIn: "+ Ƙara Abokin Ciniki na Waje",
    darkMode: "Yanayin Duhu",
    lightMode: "Yanayin Haske",
  }
};

const STORAGE_KEY = "twt-lang";

export function useLanguage() {
  const [lang, setLangState] = React.useState<Lang>(() => {
    if (typeof window === "undefined") return "EN";
    return (localStorage.getItem(STORAGE_KEY) as Lang) || "EN";
  });
  const t = React.useCallback((key: string) => DICT[lang][key] || DICT["EN"][key] || key, [lang]);
  const setLang = React.useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l.toLowerCase();
    fetch("/api/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: l }) }).catch(()=>{});
  }, []);
  React.useEffect(()=>{ document.documentElement.lang = lang.toLowerCase(); }, [lang]);
  return { lang, setLang, t, dict: DICT[lang] };
}

export function I18nProvider({ children }: { children: React.ReactNode }) { return <>{children}</>; }
export const dict = DICT;
export function getDict(lang: Lang){ return DICT[lang] || DICT.EN; }
