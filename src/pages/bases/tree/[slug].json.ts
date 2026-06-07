import type { APIRoute } from 'astro'
import { getCollection, type CollectionEntry } from 'astro:content'
import { badgeTree } from '@/lib/bases'

export async function getStaticPaths() {
  const badges = await getCollection('badges')
  return badges.map((badge) => ({ params: { slug: badge.id }, props: { badge } }))
}

export const GET: APIRoute = async ({ props }) => {
  const { badge } = props as { badge: CollectionEntry<'badges'> }
  const tree = await badgeTree(badge)
  return new Response(JSON.stringify(tree), {
    headers: { 'Content-Type': 'application/json' },
  })
}
