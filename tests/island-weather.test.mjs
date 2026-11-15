import test from 'node:test';
import assert from 'node:assert/strict';
import {daylightAt,weatherAt} from '../src/islandWeather.js';
import {residentPresence,RESIDENT_IDS} from '../src/residentLife.js';
test('light is continuous around midnight, sunrise and sunset',()=>{
 for(let minute=0;minute<2880;minute++)assert.ok(Math.abs(daylightAt(minute+1)-daylightAt(minute))<.011);
 assert.equal(daylightAt(720),1);assert.equal(daylightAt(0),0);
 assert.equal(daylightAt(1440),daylightAt(0));
});
test('rain sends every resident home while clear weather permits outdoor routines',()=>{
 for(const id of RESIDENT_IDS)for(let m=0;m<1440;m+=15)assert.equal(residentPresence(id,m,'rain').atHome,true);
 assert.ok(RESIDENT_IDS.some(id=>!residentPresence(id,980,'sunny').atHome));
 assert.ok(new Set(Array.from({length:8},(_,i)=>weatherAt(i*240))).size===3);
});
