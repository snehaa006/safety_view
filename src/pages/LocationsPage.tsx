import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Plus, Search, X } from 'lucide-react';
import { fetchLocations } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Location } from '@/types';
import { LoadingScreen } from '@/components/ui/spinner';

export default function LocationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(searchParams.get('q') || '');

  useEffect(() => {
    fetchLocations()
      .then(setLocations)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  function setSearchAndUrl(v: string) {
    setSearch(v);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (v) next.set('q', v); else next.delete('q');
      return next;
    }, { replace: true });
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return locations;
    return locations.filter((l) =>
      [l.address, l.city, l.state, l.country, l.postal_code, l.building_name].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [locations, search]);

  function mapsUrl(l: Location): string | null {
    if (l.latitude != null && l.longitude != null) return `https://maps.google.com/?q=${l.latitude},${l.longitude}`;
    const addr = [l.address, l.city, l.state, l.country].filter(Boolean).join(', ');
    return addr ? `https://maps.google.com/?q=${encodeURIComponent(addr)}` : null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Locations</h3>
          <p className="text-sm text-muted-foreground">{filtered.length} of {locations.length} location{locations.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => navigate('/locations/new')}><Plus className="h-4 w-4" /> Add Location</Button>
      </div>

      {error && <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">{error}</div>}

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text" placeholder="Search address, city, building…"
            value={search} onChange={(e) => setSearchAndUrl(e.target.value)}
            className="h-8 w-64 rounded-md border border-border bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {search && (
            <button onClick={() => setSearchAndUrl('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <Card>
        {loading ? <LoadingScreen /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead>City</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Postal</TableHead>
                <TableHead>Lat</TableHead>
                <TableHead>Lng</TableHead>
                <TableHead>Building</TableHead>
                <TableHead>Map</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => {
                const url = mapsUrl(l);
                return (
                  <TableRow key={l.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => navigate(`/locations/${l.id}`)}>
                    <TableCell>{l.address || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{l.city || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{l.state || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{l.country || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{l.postal_code || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{l.latitude ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{l.longitude ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{l.building_name || '—'}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <MapPin className="h-3 w-3" /> View
                        </a>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    {locations.length === 0 ? 'No locations yet.' : 'No locations match your search.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </section>
  );
}
