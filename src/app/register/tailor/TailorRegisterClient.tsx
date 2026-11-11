"use client";
import * as React from "react";
import { LocationPicker } from "@/components/location/LocationPicker";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function TailorRegisterClient(){
  const [loc, setLoc] = React.useState({ country:"Nigeria", countryCode:"NG", state:"Lagos", city:"Ikeja", address:"", lga:"", street:"", lat: undefined as number|undefined, lng: undefined as number|undefined, serviceRadiusKm:20 });
  return (
    <>
      <div className="space-y-2">
        <Label>Business location — structured search + auto-detect</Label>
        <LocationPicker value={{ country: loc.country, state: loc.state, city: loc.city, address: loc.address, lat: loc.lat, lng: loc.lng }} onChange={(v:any)=> setLoc({...loc, state:v.state||loc.state, city:v.city||loc.city, country:v.country||loc.country, address:v.address||loc.address, lat:v.lat||loc.lat, lng:v.lng||loc.lng})} />
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <label className="space-y-1"><span className="text-taupe">LGA / Local Area (optional)</span><Input name="lga" value={loc.lga} onChange={e=>setLoc({...loc, lga:e.target.value})} placeholder="Ikeja LGA" className="h-8 text-sm"/></label>
          <label className="space-y-1"><span className="text-taupe">Service radius (km)</span><Input name="serviceRadiusKm" type="number" value={loc.serviceRadiusKm} onChange={e=>setLoc({...loc, serviceRadiusKm: Number(e.target.value)})} className="h-8 text-sm"/></label>
        </div>
        <div className="text-[11px] text-taupe">Nigeria 36+FCT dataset with city search • Detect My Location uses permission after click only • Manual entry always allowed • Private residential addresses not published by default • Coordinates validated server-side</div>
      </div>
      <input type="hidden" name="country" value={loc.country} />
      <input type="hidden" name="countryCode" value={loc.countryCode} />
      <input type="hidden" name="state" value={loc.state} />
      <input type="hidden" name="city" value={loc.city} />
      <input type="hidden" name="lga" value={loc.lga} />
      <input type="hidden" name="address" value={loc.address} />
      <input type="hidden" name="street" value={loc.street || loc.address} />
      <input type="hidden" name="latitude" value={loc.lat? String(loc.lat):""} />
      <input type="hidden" name="longitude" value={loc.lng? String(loc.lng):""} />
      <input type="hidden" name="serviceRadiusKm" value={String(loc.serviceRadiusKm)} />
    </>
  );
}
