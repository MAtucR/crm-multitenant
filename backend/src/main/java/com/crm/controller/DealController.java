package com.crm.controller;

import com.crm.domain.Deal;
import com.crm.repository.DealRepository;
import io.micrometer.observation.annotation.Observed;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/deals")
@RequiredArgsConstructor
@Observed(name = "deal.controller")
public class DealController {

    private final DealRepository repo;

    @GetMapping
    public List<Deal> list(@RequestParam(required = false) Deal.DealStage stage) {
        if (stage != null) return repo.findByStage(stage);
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Deal> get(@PathVariable UUID id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Deal create(@RequestBody Deal deal) {
        return repo.save(deal);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Deal> update(@PathVariable UUID id,
                                       @RequestBody Deal updated) {
        return repo.findById(id).map(d -> {
            d.setTitle(updated.getTitle());
            d.setAmount(updated.getAmount());
            d.setStage(updated.getStage());
            return ResponseEntity.ok(repo.save(d));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        repo.deleteById(id);
    }
}
