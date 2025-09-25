'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  FileText, 
  Search, 
  Filter,
  Download,
  ExternalLink,
  Clock,
  BookOpen,
  Video as VideoIcon
} from 'lucide-react';
import { Video, Document } from '@/types/supabase';

export default function LibraryPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchLibraryContent();
  }, []);

  const fetchLibraryContent = async () => {
    try {
      const [videosResponse, documentsResponse] = await Promise.all([
        supabase
          .from('videos')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('documents')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
      ]);

      if (videosResponse.error) throw videosResponse.error;
      if (documentsResponse.error) throw documentsResponse.error;

      setVideos(videosResponse.data || []);
      setDocuments(documentsResponse.data || []);
    } catch (error) {
      console.error('Error fetching library content:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'all',
    ...new Set([
      ...videos.map(v => v.category).filter(Boolean),
      ...documents.map(d => d.category).filter(Boolean)
    ])
  ];

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || video.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-padding space-y-6 bg-black min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading text-white">Library</h1>
          <p className="text-white/60">Educational content and resources</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
          <Input
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 mobile-input"
          />
        </div>
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 bg-black border border-white/30 rounded-md text-sm text-white"
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === 'all' ? 'All Categories' : category}
            </option>
          ))}
        </select>
      </div>

      <Tabs defaultValue="videos" className="space-y-6">
        <TabsList>
          <TabsTrigger value="videos">Videos ({videos.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="space-y-4">
          {filteredVideos.length === 0 ? (
            <Card className="mobile-card">
              <CardContent className="text-center py-12">
                <VideoIcon className="w-12 h-12 text-gold mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2 text-white">No videos found</h3>
                <p className="text-white/60">
                  {searchQuery || selectedCategory !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'Videos will appear here when they are added to the library'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredVideos.map((video) => (
                <Card key={video.id} className="mobile-card hover:border-gold/50 transition-colors">
                  <CardHeader className="p-0">
                    <div className="relative aspect-video bg-white/10 rounded-t-lg overflow-hidden">
                      {/* Video thumbnail placeholder */}
                      <div className="w-full h-full bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center">
                        <Play className="w-12 h-12 text-gold opacity-80" />
                      </div>
                      
                      {/* Duration badge */}
                      {video.duration_seconds && (
                        <Badge className="absolute bottom-2 right-2 bg-black/80 text-white">
                          <Clock className="w-3 h-3 mr-1 text-gold" />
                          {formatDuration(video.duration_seconds)}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <CardTitle className="text-lg line-clamp-2 text-white">{video.title}</CardTitle>
                      {video.description && (
                        <p className="text-sm text-white/60 line-clamp-2 mt-1">
                          {video.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {video.category && (
                        <Badge className="text-xs bg-white/10 text-white">
                          {video.category}
                        </Badge>
                      )}
                      {video.tags?.slice(0, 2).map((tag) => (
                        <Badge key={tag} className="text-xs border-white/30 text-white bg-transparent">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <Button className="w-full bg-gold hover:bg-gold/90 text-black">
                      <Play className="w-4 h-4 mr-2 text-black" />
                      Watch Video
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          {filteredDocuments.length === 0 ? (
            <Card className="mobile-card">
              <CardContent className="text-center py-12">
                <BookOpen className="w-12 h-12 text-gold mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2 text-white">No documents found</h3>
                <p className="text-white/60">
                  {searchQuery || selectedCategory !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'Documents will appear here when they are added to the library'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredDocuments.map((document) => (
                <Card key={document.id} className="mobile-card hover:border-gold/50 transition-colors">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg line-clamp-2 text-white">{document.title}</CardTitle>
                        {document.description && (
                          <p className="text-sm text-white/60 line-clamp-2 mt-1">
                            {document.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-white/60">
                      <span className="uppercase text-gold">{document.file_type}</span>
                      {document.file_size && (
                        <span>{formatFileSize(document.file_size)}</span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {document.category && (
                        <Badge className="text-xs bg-white/10 text-white">
                          {document.category}
                        </Badge>
                      )}
                      {document.tags?.slice(0, 2).map((tag) => (
                        <Badge key={tag} className="text-xs border-white/30 text-white bg-transparent">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 border-white/30 text-white hover:bg-white/10">
                        <ExternalLink className="w-4 h-4 mr-2 text-gold" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 border-white/30 text-white hover:bg-white/10">
                        <Download className="w-4 h-4 mr-2 text-gold" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}