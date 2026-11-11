"use client";
import * as React from "react";
import { LocationPicker } from "@/components/location/LocationPicker";
import { Input } from "@/components/ui/input";
export function SellerRegisterClient(){
  const [loc, setLoc] = React.useState({ country:"Nigeria", countryCode:"NG", state:"Lagos", city:"Yaba", address:"", lga:"", lat: undefined as number|undefined, lng: undefined as number|undefined, deliveryCoverageKm:25, pickupAvailable:true });
  return <>
    <div className="space-y-2">
      <LocationPicker value={{ country: loc.country, state: loc.state, city: loc.city, address: loc.address, lat: loc.lat, lng: loc.lng }} onChange={(v:any)=> setLoc({...loc, state:v.state||loc.state, city:v.city||loc.city, country:v.country||loc.country, address:v.address||loc.address, lat:v.lat||loc.lat, lng:v.lng||loc.lng})} />
      <div className="grid md:grid-cols-3 gap-3 text-xs">
        <label className="space-y-1"><span className="text-taupe">LGA</span><Input name="lga" value={loc.lga} onChange={e=>setLoc({...loc, lga:e.target.value})} placeholder="Yaba LGA" className="h-8 text-sm"/></label>
        <label className="space-y-1"><span className="text-taupe">Delivery coverage (km)</span><Input name="deliveryCoverageKm" type="number" value={loc.deliveryCoverageKm} onChange={e=>setLoc({...loc, deliveryCoverageKm: Number(e.target.value)})} className="h-8 text-sm"/></label>
        <label className="flex gap-2 items-center pt-5 text-sm"><input type="checkbox" name="pickupAvailable" checked={loc.pickupAvailable} onChange={e=>setLoc({...loc, pickupAvailable:e.target.checked})} /> Pickup available</label>
      </div>
    </div>
    <input type="hidden" name="country" value={loc.country} />
    <input type="hidden" name="countryCode" value={loc.countryCode} />
    <input type="hidden" name="state" value={loc.state} />
    <input type="hidden" name="city" value={loc.city} />
    <input type="hidden" name="lga" value={loc.lga} />
    <input type="hidden" name="address" value={loc.address} />
    <input type="hidden" name="latitude" value={loc.lat? String(loc.lat):""} />
    <input type="hidden" name="longitude" value={loc.lng? String(loc.lng):""} />
    <input type="hidden" name="deliveryCoverageKm" value={String(loc.deliveryCoverageKm)} />
  </>;
}
