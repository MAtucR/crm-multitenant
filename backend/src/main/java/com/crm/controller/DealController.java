package com.crm.controller;

import com.crm.domain.Deal;
import com.crm.repository.DealRepository;
import io.micrometer.observation.annotation.Observed;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/deals")
@RequiredArgsConstructor
@Observed(name = "deal.controller")
public class DealController {

    private final DealRepository repo;

    @GetMapping
    public Page<Deal> list(
            @RequestParam(required = false) Deal.DealStage stage,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        if (stage != null) return repo.findByStage(stage, pageable);
        return repo.findAll(pageable);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Deal> get(@PathVariable UUID id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Deal create(@Valid @RequestBody Deal deal) {
        deal.setId(null);
        return repo.save(deal);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Deal> update(@PathVariable UUID id,
                                       @Valid @RequestBody Deal updated) {
        return repo.findById(id).map(d -> {
            d.setTitle(updated.getTitle());
            d.setAmount(updated.getAmount());
            d.setStage(updated.getStage());
            d.setClosedAt(updated.getClosedAt());
            return ResponseEntity.ok(repo.save(d));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        if (!repo.existsById(id)) {
            throw new com.crm.exception.ResourceNotFoundException("Deal", id);
        }
        repo.deleteById(id);
    }
}
