'use client';
import { useParams, useSearchParams } from 'next/navigation';
import { AdminDocumentDetail } from '@/components/admin-document-detail';
export default function Page(){const {id}=useParams<{id:string}>();const search=useSearchParams();return <AdminDocumentDetail id={id} versionId={search.get('versionId')??undefined}/>;}
