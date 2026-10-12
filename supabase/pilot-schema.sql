-- Aplicar apenas no projeto dedicado Secretária Virtual.
-- Estado global com lease: conserva a serialização do piloto Node.
create table public.secretaria_pilot_state (
  id boolean primary key default true check (id),
  data jsonb not null default '{"contacts":{}}'::jsonb,
  lease_token uuid,
  lease_until timestamptz
);
alter table public.secretaria_pilot_state enable row level security;
revoke all on public.secretaria_pilot_state from public, anon, authenticated;
grant select, insert, update on public.secretaria_pilot_state to service_role;
insert into public.secretaria_pilot_state(id) values (true);

create function public.secretaria_acquire(p_token uuid) returns jsonb
language sql security invoker set search_path = '' as $$
  update public.secretaria_pilot_state
  set lease_token = p_token, lease_until = clock_timestamp() + interval '120 seconds'
  where id = true and (lease_until is null or lease_until < clock_timestamp())
  returning data;
$$;
create function public.secretaria_save(p_token uuid, p_data jsonb) returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  update public.secretaria_pilot_state
  set data = p_data, lease_until = clock_timestamp() + interval '120 seconds'
  where id = true and lease_token = p_token and lease_until > clock_timestamp();
  return found;
end;
$$;
create function public.secretaria_release(p_token uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  update public.secretaria_pilot_state set lease_token = null, lease_until = null
  where id = true and lease_token = p_token;
  return found;
end;
$$;
revoke all on function public.secretaria_acquire(uuid) from public, anon, authenticated;
revoke all on function public.secretaria_save(uuid,jsonb) from public, anon, authenticated;
revoke all on function public.secretaria_release(uuid) from public, anon, authenticated;
grant execute on function public.secretaria_acquire(uuid) to service_role;
grant execute on function public.secretaria_save(uuid,jsonb) to service_role;
grant execute on function public.secretaria_release(uuid) to service_role;
