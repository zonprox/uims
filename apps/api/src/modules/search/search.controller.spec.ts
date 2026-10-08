import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

describe('SearchController', () => {
  let controller: SearchController;
  let searchService: {
    search: ReturnType<typeof vi.fn>;
    syncAllToMeilisearch: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    searchService = {
      search: vi.fn(),
      syncAllToMeilisearch: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: searchService,
        },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should delegate search to SearchService with query DTO', async () => {
      const mockResult = {
        results: [{ id: '1', title: 'ThinkPad T14', type: 'asset' }],
        total: 1,
      };
      searchService.search.mockResolvedValue(mockResult);

      const query: SearchQueryDto = {
        q: 'ThinkPad',
        limit: 10,
        type: 'assets',
      };

      const result = await controller.search(query);

      expect(searchService.search).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResult);
    });
  });

  describe('sync', () => {
    it('should delegate sync to SearchService syncAllToMeilisearch', async () => {
      searchService.syncAllToMeilisearch.mockResolvedValue({ synchronized: true });

      const result = await controller.sync();

      expect(searchService.syncAllToMeilisearch).toHaveBeenCalled();
      expect(result).toEqual({ synchronized: true });
    });
  });
});
